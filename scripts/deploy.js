const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) {
    throw new Error("No deployer account. Set PRIVATE_KEY in .env first.");
  }

  console.log("Deploying AgriculturalGuaranteeNetwork with:", deployer.address);

  const Network = await hre.ethers.getContractFactory("AgriculturalGuaranteeNetwork");
  const network = await Network.deploy();
  await network.waitForDeployment();

  const address = await network.getAddress();
  console.log("AgriculturalGuaranteeNetwork deployed to:", address);
  console.log("Network:", hre.network.name);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
