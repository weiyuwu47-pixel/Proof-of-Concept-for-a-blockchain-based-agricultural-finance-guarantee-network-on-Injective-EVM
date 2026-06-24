# Injective 农业融资担保 Demo

这是一个基于 Injective EVM 的农业融资担保 PoC demo。项目把“农户申请融资、合作社/核心企业订单背书、担保机构授信、银行放款、农户还款或担保代偿、链上审计留痕”做成了可运行的前端流程和可部署的 Solidity 合约。

## 项目结构

```text
contracts/AgriculturalGuaranteeNetwork.sol  链上状态机合约
scripts/deploy.js                           Hardhat 部署脚本
scripts/seed-demo.js                        部署后灌入一条示例融资流程
scripts/make-banner.js                      生成前端横幅 PNG 资产
public/index.html                           静态前端入口
public/src/app.js                           前端流程模拟逻辑
public/src/styles.css                       仪表盘样式
```

## 业务流程

1. 农户提交融资申请，写入作物、地块、采购订单、授信资料索引和申请金额。
2. 合作社或核心企业确认订单真实性，提供第一还款来源背书。
3. 担保机构根据资料审批担保，设置担保覆盖比例和费率。
4. 银行看到担保审批后放款，合约事件记录放款金额和到期日。
5. 农户到期还款，资金流转给银行，贷款状态变为 `Repaid`。
6. 若逾期，银行触发赔付申请，担保机构按覆盖比例代偿，状态变为 `Compensated`。

## 本地运行前端

前端不依赖 npm 包，可以直接用 Python 静态服务器运行：

```bash
node scripts/make-banner.js
cd public
python3 -m http.server 5173
```

然后打开：

```text
http://127.0.0.1:5173
```

## 部署到 Injective EVM

先安装依赖：

```bash
npm install
```

复制环境变量：

```bash
cp .env.example .env
```

填入部署钱包私钥。`.env.example` 中的 RPC 与 chainId 按 Injective 官方 EVM 网络信息页配置：mainnet chainId `1776`，testnet chainId `1439`。

编译合约：

```bash
npm run compile
```

如果 Hardhat 在当前网络下无法下载 Solidity 编译器，可以使用已安装的 solc-js 编译脚本：

```bash
npm run compile:solcjs
```

部署到测试网：

```bash
npm run deploy:injective-testnet
```

部署成功后，把控制台输出的合约地址填到前端 `public/src/app.js` 或直接替换页面里的 `Contract` 显示值。需要灌入链上示例数据时：

```bash
CONTRACT_ADDRESS=0xYourContractAddress npx hardhat run scripts/seed-demo.js --network injectiveTestnet
```

## 合约核心

`AgriculturalGuaranteeNetwork` 使用原生 INJ 作为资金单位，关键函数如下：

```text
applyForLoan       农户提交融资申请
buyerEndorse       订单方/核心企业背书
approveGuarantee   担保机构审批担保
fundLoan           银行支付本金并放款给农户
repayLoan          农户还款给银行
requestClaim       银行在逾期后触发赔付
compensateClaim    担保机构向银行代偿
```

合约会为每个节点发出事件，前端或索引服务可以订阅事件形成审计日志。

## 当前版本完成记录

### v0.1.0 / 2026-06-24

本版本已完成一个可演示、可编译、可部署的 Injective EVM 农业融资担保 PoC：

```text
业务流程
- 农户融资申请
- 合作社/核心企业订单背书
- 担保机构审批授信
- 银行放款
- 正常还款
- 逾期赔付与担保代偿
- 链上审计日志

链上合约
- 实现 AgriculturalGuaranteeNetwork 主合约
- 每笔贷款使用独立 Loan 记录
- 使用 LoanStatus 状态机约束流程顺序
- 通过事件记录申请、背书、审批、放款、还款、赔付、拒绝等节点
- 使用原生 INJ 作为 demo 资金单位
- 提供 payoffAmount 与 guaranteeExposure 风险测算函数

前端 demo
- 完成静态单页操作台
- 支持农户、核心企业、担保机构、银行四类角色切换
- 支持一键推进完整融资担保流程
- 支持逾期赔付分支
- 展示资金参数、担保敞口、链上摘要和审计日志
- 内置农业金融网络横幅图片资产

工程配置
- 添加 Hardhat 部署配置
- 配置 Injective EVM mainnet/testnet RPC 与 chainId
- 添加部署脚本 scripts/deploy.js
- 添加示例数据脚本 scripts/seed-demo.js
- 添加 solc-js 编译脚本 scripts/compile-solcjs.js，避免网络下载 Solidity 编译器失败时无法验证
- 添加 .env.example 与 .gitignore
```

已本地验证：

```text
npm install
npm run compile:solcjs
node --check public/src/app.js
Vite 本地服务 http://127.0.0.1:5175/ 返回 200 OK
```
