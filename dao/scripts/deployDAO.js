const { ethers } = require("hardhat");

/**
 * Despliega token, timelock y governor, y deja los permisos del timelock en su
 * estado final: solo el governor propone y cancela, cualquiera ejecuta lo ya
 * aprobado, y nadie conserva el rol de administrador.
 */
async function deployDAO(config, { log = () => {} } = {}) {
  const [deployer] = await ethers.getSigners();

  const distribution = config.initialDistribution.length
    ? config.initialDistribution
    : [{ address: deployer.address, amount: config.defaultSupply }];
  const recipients = distribution.map((d) => d.address);
  const amounts = distribution.map((d) => ethers.parseUnits(String(d.amount), 18));

  const token = await ethers.deployContract("DAOToken", [
    config.tokenName,
    config.tokenSymbol,
    recipients,
    amounts,
  ]);
  await token.waitForDeployment();
  log(`DAOToken:           ${await token.getAddress()}`);

  // Sin proposers al inicio; el deployer queda como admin temporal para asignar roles.
  const timelock = await ethers.deployContract("TimelockController", [
    config.timelockDelay,
    [],
    [ethers.ZeroAddress], // executor = cualquiera
    deployer.address,
  ]);
  await timelock.waitForDeployment();
  log(`TimelockController: ${await timelock.getAddress()}`);

  const governor = await ethers.deployContract("DAOGovernor", [
    config.governorName,
    await token.getAddress(),
    await timelock.getAddress(),
    config.votingDelay,
    config.votingPeriod,
    ethers.parseUnits(String(config.proposalThreshold), 18),
    config.quorumPercent,
  ]);
  await governor.waitForDeployment();
  const governorAddress = await governor.getAddress();
  log(`DAOGovernor:        ${governorAddress}`);

  await (await timelock.grantRole(await timelock.PROPOSER_ROLE(), governorAddress)).wait();
  await (await timelock.grantRole(await timelock.CANCELLER_ROLE(), governorAddress)).wait();
  await (await timelock.renounceRole(await timelock.DEFAULT_ADMIN_ROLE(), deployer.address)).wait();
  log("Roles del timelock asignados; el deployer renunció a la administración.");

  return { token, timelock, governor, deployer };
}

module.exports = { deployDAO };
