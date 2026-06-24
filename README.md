# Injective-based Agricultural Guarantee Network

This project explores how Injective EVM can be used to redesign real-world agricultural loan guarantee systems through on-chain governance, transparent rules, and off-chain execution.

The design is inspired by real product experience in provincial-level agricultural financing guarantee systems in China. The current repository now includes both the original concept documentation and a runnable Injective EVM proof-of-concept demo.

## Author's Note on Language

The original version of this project is written in Chinese.

The English version is translated with the assistance of ChatGPT.

If you can read Chinese, please refer to the Chinese version first. In case of any discrepancy between the two versions, the Chinese version should be considered authoritative.

## Documentation

- Chinese original: `agri-guarantee-on-injective-zh.md`
- English translation: `agri-guarantee-on-injective-en.md`
- Builder profile: `About the Builder.md`

## Video & Content

3-minute explainer video:

https://x.com/YvonneXiaoyu/status/2011843920490353121

X thread summary:

https://x.com/YvonneXiaoyu/status/2011843907878076542?s=20

## Demo Overview

This repository includes a runnable demo for the agricultural finance guarantee workflow on Injective EVM. The demo turns the process of farmer application, buyer endorsement, guarantee approval, bank funding, repayment, overdue claim, and guarantee compensation into a Solidity state machine and an interactive dashboard.

## Demo Project Structure

```text
contracts/AgriculturalGuaranteeNetwork.sol  On-chain workflow state machine
scripts/deploy.js                           Hardhat deployment script
scripts/seed-demo.js                        Seed one demo financing workflow
scripts/compile-solcjs.js                   solc-js fallback compiler
scripts/make-banner.js                      Generate local dashboard banner PNG
public/index.html                           Static frontend entry
public/src/app.js                           Frontend workflow simulation logic
public/src/styles.css                       Dashboard styles
```

## Business Flow Implemented

1. Farmer submits a financing application with crop, location, order, credit-file metadata, and requested principal.
2. Cooperative or core buyer confirms the purchase order and endorses the first repayment source.
3. Guarantee institution approves coverage ratio and guarantee fee.
4. Bank funds the loan after guarantee approval.
5. Farmer repays principal and interest on maturity.
6. If overdue, the bank requests a claim and the guarantor compensates according to the coverage ratio.
7. Every key step emits contract events and is reflected in the audit timeline.

## Run the Frontend Demo

Install dependencies:

```bash
npm install
```

Start the Vite demo:

```bash
npm run dev
```

Then open:

```text
http://127.0.0.1:5173
```

If you want to run the static frontend without Vite:

```bash
node scripts/make-banner.js
cd public
python3 -m http.server 5173
```

## Deploy to Injective EVM

Copy the environment file:

```bash
cp .env.example .env
```

Fill in your deployer private key. The demo uses Injective EVM network parameters from the official Injective EVM network information page:

```text
Mainnet chainId: 1776
Testnet chainId: 1439
```

Compile with Hardhat:

```bash
npm run compile
```

If Hardhat cannot download the Solidity compiler in the current network environment, use the solc-js fallback:

```bash
npm run compile:solcjs
```

Deploy to Injective EVM testnet:

```bash
npm run deploy:injective-testnet
```

Seed one demo flow after deployment:

```bash
CONTRACT_ADDRESS=0xYourContractAddress npx hardhat run scripts/seed-demo.js --network injectiveTestnet
```

## Smart Contract Entry Points

```text
applyForLoan       Farmer submits a financing application
buyerEndorse       Buyer/cooperative confirms the order
approveGuarantee   Guarantor approves coverage and fee
fundLoan           Bank releases principal to farmer
repayLoan          Farmer repays the bank
requestClaim       Bank requests compensation after overdue
compensateClaim    Guarantor compensates the bank
```

## Current Version Completion Record

### v0.1.0 / 2026-06-24

This version completes a runnable, compilable, and deployable Injective EVM agricultural finance guarantee PoC.

Completed workflow:

```text
- Farmer financing application
- Cooperative/core buyer order endorsement
- Guarantee institution credit approval
- Bank funding
- Normal repayment
- Overdue claim and guarantee compensation
- On-chain audit events
```

Completed smart contract work:

```text
- Implemented AgriculturalGuaranteeNetwork main contract
- Added one Loan record per financing application
- Added LoanStatus state machine
- Added events for application, endorsement, approval, funding, repayment, claim, compensation, rejection, and cancellation
- Used native INJ as the demo funding unit
- Added payoffAmount and guaranteeExposure calculation helpers
```

Completed frontend work:

```text
- Added static single-page dashboard
- Added four role switches: farmer, buyer, guarantor, bank
- Added one-click workflow progression
- Added overdue compensation branch
- Added risk metrics, contract summary, and audit log
- Added local agricultural finance network banner asset
```

Completed engineering setup:

```text
- Added Hardhat deployment config
- Added Injective EVM mainnet/testnet RPC and chainId settings
- Added scripts/deploy.js
- Added scripts/seed-demo.js
- Added scripts/compile-solcjs.js
- Added .env.example
- Added .gitignore
```

Local verification completed:

```text
npm install
npm run compile:solcjs
node --check public/src/app.js
Vite local server returned 200 OK
```

## About the Author

Open to DevRel opportunities.

Bachelor's degree in Computer Science.

From 2023 to 2024, worked as a product manager on the digitalization of provincial agricultural financing guarantee systems, focusing on system design and cross-institution coordination.

Currently a Chinese-language finance content creator.
