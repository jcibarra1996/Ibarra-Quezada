const { network } = require("hardhat");
const config = require("../dao.config");
const { deployDAO } = require("./deployDAO");

async function main() {
  console.log(`Desplegando en la red "${network.name}"...`);
  await deployDAO(config, { log: console.log });
  console.log(
    "\nListo. Recuerda que cada titular debe delegar sus votos (token.delegate) antes de que cuenten."
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
