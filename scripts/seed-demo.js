const hre = require("hardhat");

const names = [
  ["Farmer Li", "farmer"],
  ["Yunhe Cooperative", "buyer"],
  ["County Guarantee Center", "guarantor"],
  ["Rural Commercial Bank", "bank"]
];

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error("Set CONTRACT_ADDRESS to a deployed AgriculturalGuaranteeNetwork address.");
  }

  const [admin, farmer, buyer, guarantor, bank] = await hre.ethers.getSigners();
  const network = await hre.ethers.getContractAt("AgriculturalGuaranteeNetwork", contractAddress);

  for (const [index, signer] of [farmer, buyer, guarantor, bank].entries()) {
    const [name, role] = names[index];
    await (await network.connect(admin).registerActor(signer.address, name, role)).wait();
  }

  const principal = hre.ethers.parseEther("8");
  const tx = await network.connect(farmer).applyForLoan(
    buyer.address,
    guarantor.address,
    bank.address,
    "Greenhouse tomato",
    "Qinghe county demonstration farm",
    "ipfs://demo/greenhouse-tomato-credit-file",
    principal,
    850,
    180,
    8000,
    180
  );
  const receipt = await tx.wait();
  const event = receipt.logs
    .map((log) => {
      try {
        return network.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((parsed) => parsed && parsed.name === "LoanApplied");

  const loanId = event.args.loanId;
  await (await network.connect(buyer).buyerEndorse(loanId, "Offtake order confirmed for 60 tons.")).wait();
  await (await network.connect(guarantor).approveGuarantee(loanId, "Risk score passed, 80% coverage approved.")).wait();
  await (await network.connect(bank).fundLoan(loanId, "Funds released after guarantee confirmation.", { value: principal })).wait();

  console.log("Seeded demo loan:", loanId.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
