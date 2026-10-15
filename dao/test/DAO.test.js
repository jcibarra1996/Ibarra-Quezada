const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const { deployDAO } = require("../scripts/deployDAO");

const DAY = 24 * 60 * 60;
const State = { Pending: 0, Active: 1, Canceled: 2, Defeated: 3, Succeeded: 4, Queued: 5, Expired: 6, Executed: 7 };
const Vote = { Against: 0, For: 1, Abstain: 2 };

async function fixture() {
  const [, alice, bob, carol, dave, outsider] = await ethers.getSigners();
  const config = {
    tokenName: "Test DAO",
    tokenSymbol: "TDAO",
    governorName: "Test DAO Governor",
    initialDistribution: [
      { address: alice.address, amount: 400_000 },
      { address: bob.address, amount: 300_000 },
      { address: carol.address, amount: 290_000 },
      { address: dave.address, amount: 10_000 }, // 1%, por debajo del quórum
    ],
    defaultSupply: 0,
    votingDelay: 1 * DAY,
    votingPeriod: 7 * DAY,
    proposalThreshold: 0,
    quorumPercent: 4,
    timelockDelay: 2 * DAY,
  };
  const dao = await deployDAO(config);
  for (const holder of [alice, bob, carol, dave]) {
    await dao.token.connect(holder).delegate(holder.address);
  }
  return { ...dao, config, alice, bob, carol, dave, outsider };
}

// Propuesta: el timelock (tesorería) envía `amount` ETH a `to`.
async function proposeTransfer(governor, proposer, to, amount, description = "Pago de prueba") {
  const args = [[to], [amount], ["0x"], description];
  await governor.connect(proposer).propose(...args);
  const descriptionHash = ethers.id(description);
  const proposalId = await governor.hashProposal(args[0], args[1], args[2], descriptionHash);
  return { proposalId, targets: args[0], values: args[1], calldatas: args[2], descriptionHash };
}

describe("DAO", function () {
  describe("Despliegue", function () {
    it("reparte el suministro fijo según la configuración", async function () {
      const { token, alice, dave } = await loadFixture(fixture);
      expect(await token.totalSupply()).to.equal(ethers.parseUnits("1000000", 18));
      expect(await token.balanceOf(alice.address)).to.equal(ethers.parseUnits("400000", 18));
      expect(await token.balanceOf(dave.address)).to.equal(ethers.parseUnits("10000", 18));
    });

    it("usa reloj por timestamp en token y governor", async function () {
      const { token, governor } = await loadFixture(fixture);
      expect(await token.CLOCK_MODE()).to.equal("mode=timestamp");
      expect(await governor.CLOCK_MODE()).to.equal("mode=timestamp");
    });

    it("deja el timelock sin administrador humano", async function () {
      const { timelock, governor, deployer } = await loadFixture(fixture);
      const gov = await governor.getAddress();
      expect(await timelock.hasRole(await timelock.PROPOSER_ROLE(), gov)).to.equal(true);
      expect(await timelock.hasRole(await timelock.CANCELLER_ROLE(), gov)).to.equal(true);
      expect(await timelock.hasRole(await timelock.EXECUTOR_ROLE(), ethers.ZeroAddress)).to.equal(true);
      expect(await timelock.hasRole(await timelock.DEFAULT_ADMIN_ROLE(), deployer.address)).to.equal(false);
      expect(await timelock.hasRole(await timelock.PROPOSER_ROLE(), deployer.address)).to.equal(false);
    });

    it("nadie puede usar el timelock por fuera del governor", async function () {
      const { timelock, deployer, outsider } = await loadFixture(fixture);
      await expect(
        timelock
          .connect(deployer)
          .schedule(outsider.address, 1, "0x", ethers.ZeroHash, ethers.ZeroHash, 2 * DAY)
      ).to.be.revertedWithCustomError(timelock, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Votos", function () {
    it("los tokens sin delegar no cuentan como voto", async function () {
      const { token, alice, outsider } = await loadFixture(fixture);
      await token.connect(alice).transfer(outsider.address, ethers.parseUnits("1000", 18));
      expect(await token.getVotes(outsider.address)).to.equal(0);
      await token.connect(outsider).delegate(outsider.address);
      expect(await token.getVotes(outsider.address)).to.equal(ethers.parseUnits("1000", 18));
    });

    it("tokens recibidos después del snapshot no votan en esa propuesta", async function () {
      const { governor, token, alice, bob, outsider } = await loadFixture(fixture);
      const { proposalId } = await proposeTransfer(governor, alice, outsider.address, 0);
      await time.increase(1 * DAY + 1);
      await token.connect(bob).transfer(outsider.address, ethers.parseUnits("300000", 18));
      await token.connect(outsider).delegate(outsider.address);
      await governor.connect(outsider).castVote(proposalId, Vote.For);
      const [, forVotes] = await governor.proposalVotes(proposalId);
      expect(forVotes).to.equal(0);
    });
  });

  describe("Ciclo completo de una propuesta", function () {
    it("propone, vota, encola y ejecuta un pago desde la tesorería", async function () {
      const { governor, timelock, alice, bob, outsider } = await loadFixture(fixture);
      await alice.sendTransaction({ to: await timelock.getAddress(), value: ethers.parseEther("5") });

      const amount = ethers.parseEther("1");
      const p = await proposeTransfer(governor, alice, outsider.address, amount);
      expect(await governor.state(p.proposalId)).to.equal(State.Pending);

      await time.increase(1 * DAY + 1);
      expect(await governor.state(p.proposalId)).to.equal(State.Active);
      await governor.connect(alice).castVote(p.proposalId, Vote.For);
      await governor.connect(bob).castVote(p.proposalId, Vote.Against);

      await time.increase(7 * DAY);
      expect(await governor.state(p.proposalId)).to.equal(State.Succeeded);

      await governor.queue(p.targets, p.values, p.calldatas, p.descriptionHash);
      expect(await governor.state(p.proposalId)).to.equal(State.Queued);

      // Antes de que venza el retraso del timelock no se puede ejecutar.
      await expect(governor.execute(p.targets, p.values, p.calldatas, p.descriptionHash)).to.be.reverted;

      await time.increase(2 * DAY + 1);
      await expect(
        governor.execute(p.targets, p.values, p.calldatas, p.descriptionHash)
      ).to.changeEtherBalances([timelock, outsider], [-amount, amount]);
      expect(await governor.state(p.proposalId)).to.equal(State.Executed);
    });

    it("se rechaza si no alcanza el quórum", async function () {
      const { governor, dave, outsider } = await loadFixture(fixture);
      const p = await proposeTransfer(governor, dave, outsider.address, 0);
      await time.increase(1 * DAY + 1);
      await governor.connect(dave).castVote(p.proposalId, Vote.For);
      await time.increase(7 * DAY);
      expect(await governor.state(p.proposalId)).to.equal(State.Defeated);
    });

    it("se rechaza si hay más votos en contra que a favor", async function () {
      const { governor, alice, bob, carol, outsider } = await loadFixture(fixture);
      const p = await proposeTransfer(governor, alice, outsider.address, 0);
      await time.increase(1 * DAY + 1);
      await governor.connect(alice).castVote(p.proposalId, Vote.For);
      await governor.connect(bob).castVote(p.proposalId, Vote.Against);
      await governor.connect(carol).castVote(p.proposalId, Vote.Against);
      await time.increase(7 * DAY);
      expect(await governor.state(p.proposalId)).to.equal(State.Defeated);
    });

    it("no permite votar dos veces", async function () {
      const { governor, alice, outsider } = await loadFixture(fixture);
      const p = await proposeTransfer(governor, alice, outsider.address, 0);
      await time.increase(1 * DAY + 1);
      await governor.connect(alice).castVote(p.proposalId, Vote.For);
      await expect(governor.connect(alice).castVote(p.proposalId, Vote.For)).to.be.revertedWithCustomError(
        governor,
        "GovernorAlreadyCastVote"
      );
    });
  });

  describe("Autogobierno", function () {
    it("solo la propia DAO, por votación, puede cambiar sus reglas", async function () {
      const { governor, alice } = await loadFixture(fixture);
      await expect(governor.connect(alice).setVotingPeriod(3 * DAY)).to.be.revertedWithCustomError(
        governor,
        "GovernorOnlyExecutor"
      );

      const description = "Reducir el periodo de votación a 3 días";
      const targets = [await governor.getAddress()];
      const values = [0];
      const calldatas = [governor.interface.encodeFunctionData("setVotingPeriod", [3 * DAY])];
      await governor.connect(alice).propose(targets, values, calldatas, description);
      const descriptionHash = ethers.id(description);
      const proposalId = await governor.hashProposal(targets, values, calldatas, descriptionHash);

      await time.increase(1 * DAY + 1);
      await governor.connect(alice).castVote(proposalId, Vote.For);
      await time.increase(7 * DAY);
      await governor.queue(targets, values, calldatas, descriptionHash);
      await time.increase(2 * DAY + 1);
      await governor.execute(targets, values, calldatas, descriptionHash);

      expect(await governor.votingPeriod()).to.equal(3 * DAY);
    });
  });
});
