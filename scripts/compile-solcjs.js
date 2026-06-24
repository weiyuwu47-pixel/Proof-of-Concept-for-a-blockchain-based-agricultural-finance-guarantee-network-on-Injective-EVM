const fs = require("fs");
const path = require("path");
const solc = require("solc");

const contractPath = path.join(__dirname, "..", "contracts", "AgriculturalGuaranteeNetwork.sol");
const source = fs.readFileSync(contractPath, "utf8");

const input = {
  language: "Solidity",
  sources: {
    "AgriculturalGuaranteeNetwork.sol": {
      content: source
    }
  },
  settings: {
    viaIR: true,
    optimizer: {
      enabled: true,
      runs: 200
    },
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"]
      }
    }
  }
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = output.errors || [];
const fatalErrors = errors.filter((error) => error.severity === "error");

for (const error of errors) {
  const stream = error.severity === "error" ? process.stderr : process.stdout;
  stream.write(`${error.formattedMessage}\n`);
}

if (fatalErrors.length) {
  process.exitCode = 1;
  return;
}

const compiled = output.contracts["AgriculturalGuaranteeNetwork.sol"].AgriculturalGuaranteeNetwork;
const outDir = path.join(__dirname, "..", "artifacts", "solcjs");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "AgriculturalGuaranteeNetwork.json"),
  JSON.stringify(
    {
      contractName: "AgriculturalGuaranteeNetwork",
      abi: compiled.abi,
      bytecode: `0x${compiled.evm.bytecode.object}`,
      deployedBytecode: `0x${compiled.evm.deployedBytecode.object}`,
      compiler: solc.version()
    },
    null,
    2
  )
);

console.log(`Compiled AgriculturalGuaranteeNetwork with solc ${solc.version()}`);
console.log("Artifact: artifacts/solcjs/AgriculturalGuaranteeNetwork.json");
