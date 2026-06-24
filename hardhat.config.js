require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const privateKey = process.env.PRIVATE_KEY || "";

function accounts() {
  return privateKey ? [privateKey] : [];
}

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    injectiveTestnet: {
      url: process.env.INJECTIVE_TESTNET_RPC_URL || "https://k8s.testnet.json-rpc.injective.network/",
      chainId: Number(process.env.INJECTIVE_TESTNET_CHAIN_ID || 1439),
      accounts: accounts()
    },
    injectiveMainnet: {
      url: process.env.INJECTIVE_MAINNET_RPC_URL || "https://sentry.evm-rpc.injective.network/",
      chainId: Number(process.env.INJECTIVE_MAINNET_CHAIN_ID || 1776),
      accounts: accounts()
    }
  }
};
