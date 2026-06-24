const roles = [
  { id: "farmer", icon: "F", name: "农户", address: "0xFarmer...7a31" },
  { id: "buyer", icon: "B", name: "合作社/核心企业", address: "0xBuyer...18cd" },
  { id: "guarantor", icon: "G", name: "担保机构", address: "0xGuarantee...b902" },
  { id: "bank", icon: "L", name: "贷款银行", address: "0xBank...45ef" }
];

const steps = [
  {
    id: "Applied",
    title: "融资申请",
    actor: "farmer",
    note: "农户提交订单、种植和物联网资料",
    action: "提交申请"
  },
  {
    id: "BuyerEndorsed",
    title: "订单背书",
    actor: "buyer",
    note: "核心企业确认收购合同与回款来源",
    action: "确认背书"
  },
  {
    id: "GuaranteeApproved",
    title: "担保审批",
    actor: "guarantor",
    note: "担保机构核定覆盖比例与费率",
    action: "通过担保"
  },
  {
    id: "BankFunded",
    title: "银行放款",
    actor: "bank",
    note: "银行依据担保函释放 INJ 资金",
    action: "执行放款"
  },
  {
    id: "Repaid",
    title: "到期还款",
    actor: "farmer",
    note: "农户回款后偿还本金和利息",
    action: "完成还款"
  },
  {
    id: "Compensated",
    title: "代偿闭环",
    actor: "guarantor",
    note: "逾期时担保机构按覆盖比例赔付",
    action: "执行代偿"
  }
];

const initialLoan = {
  status: "Draft",
  principal: 8,
  interestRate: 8.5,
  guaranteeFee: 1.8,
  coverage: 80,
  tenorDays: 180,
  repaid: 0,
  events: []
};

let selectedRole = "farmer";
let loan = loadLoan();

const roleGrid = document.querySelector("#roleGrid");
const stepper = document.querySelector("#stepper");
const actionRow = document.querySelector("#actionRow");
const timeline = document.querySelector("#timeline");
const eventCount = document.querySelector("#eventCount");
const resetButton = document.querySelector("#resetButton");
const metricStatus = document.querySelector("#metricStatus");
const exposureValue = document.querySelector("#exposureValue");

function loadLoan() {
  const stored = localStorage.getItem("injective-agri-loan");
  if (!stored) return structuredClone(initialLoan);
  try {
    return { ...structuredClone(initialLoan), ...JSON.parse(stored) };
  } catch {
    return structuredClone(initialLoan);
  }
}

function saveLoan() {
  localStorage.setItem("injective-agri-loan", JSON.stringify(loan));
}

function statusIndex(status = loan.status) {
  if (status === "Draft") return -1;
  if (status === "ClaimRequested") return 4;
  const index = steps.findIndex((step) => step.id === status);
  return index;
}

function nextStep() {
  if (["Repaid", "Compensated", "Rejected", "Cancelled"].includes(loan.status)) return null;
  if (loan.status === "ClaimRequested") return steps[5];
  if (loan.status === "Draft") return steps[0];
  if (loan.status === "BankFunded") return steps[4];
  const index = statusIndex();
  return steps[index + 1] || null;
}

function statusLabel(status = loan.status) {
  const labels = {
    Draft: "待申请",
    Applied: "待订单背书",
    BuyerEndorsed: "待担保审批",
    GuaranteeApproved: "待银行放款",
    BankFunded: "已放款",
    Repaid: "已还款",
    ClaimRequested: "已触发赔付",
    Compensated: "已代偿",
    Rejected: "已拒绝",
    Cancelled: "已取消"
  };
  return labels[status] || status;
}

function payoffAmount() {
  const interest = loan.principal * (loan.interestRate / 100) * (loan.tenorDays / 365);
  return loan.principal + interest;
}

function exposureAmount() {
  const shortfall = Math.max(payoffAmount() - loan.repaid, 0);
  return shortfall * (loan.coverage / 100);
}

function addEvent(title, detail, tone = "success") {
  const now = new Date();
  loan.events.unshift({
    title,
    detail,
    tone,
    at: now.toLocaleString("zh-CN", { hour12: false })
  });
}

function actOnStep(step) {
  const exposureBefore = exposureAmount();
  loan.status = step.id;

  const messages = {
    Applied: ["LoanApplied", "农户将融资申请、订单和种植档案写入链上索引。"],
    BuyerEndorsed: ["BuyerEndorsed", "核心企业确认采购订单，银行获得第一还款来源凭据。"],
    GuaranteeApproved: ["GuaranteeApproved", "担保机构批准 80% 风险覆盖，并锁定担保费率。"],
    BankFunded: ["BankFunded", "银行放款 8.00 INJ，资金直接进入农户地址。"],
    Repaid: ["LoanRepaid", `农户偿还 ${payoffAmount().toFixed(2)} INJ，贷款正常闭环。`],
    Compensated: ["ClaimCompensated", `担保机构赔付 ${exposureBefore.toFixed(2)} INJ 给银行。`]
  };

  const [title, detail] = messages[step.id];
  if (step.id === "Repaid") loan.repaid = payoffAmount();
  if (step.id === "Compensated") loan.repaid = payoffAmount();
  addEvent(title, detail, step.id === "Compensated" ? "warn" : "success");
  saveLoan();
  render();
}

function requestClaim() {
  loan.status = "ClaimRequested";
  loan.repaid = loan.principal * 0.2;
  addEvent("ClaimRequested", `银行登记逾期短款，待赔付敞口 ${exposureAmount().toFixed(2)} INJ。`, "danger");
  saveLoan();
  render();
}

function rejectCurrent() {
  const actor = roles.find((role) => role.id === selectedRole);
  loan.status = "Rejected";
  addEvent("LoanRejected", `${actor.name}驳回当前融资节点，原因已写入审计日志。`, "danger");
  saveLoan();
  render();
}

function reset() {
  loan = structuredClone(initialLoan);
  addEvent("DemoReset", "流程已重置为待申请状态。", "warn");
  saveLoan();
  render();
}

function renderRoles() {
  roleGrid.innerHTML = roles
    .map((role) => `
      <button class="role-button ${role.id === selectedRole ? "active" : ""}" data-role="${role.id}" type="button">
        <span class="role-icon">${role.icon}</span>
        <span>
          <strong>${role.name}</strong>
          <small>${role.address}</small>
        </span>
      </button>
    `)
    .join("");

  roleGrid.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      selectedRole = button.dataset.role;
      render();
    });
  });
}

function renderSteps() {
  const currentIndex = statusIndex();
  stepper.innerHTML = steps
    .map((step, index) => {
      let className = "step";
      if (loan.status === "Rejected") className += " rejected";
      else if (index < currentIndex || step.id === loan.status) className += " done";
      else if (index === currentIndex + 1 || step.id === loan.status) className += " current";
      return `
        <div class="${className}">
          <span class="step-index">${index + 1}</span>
          <strong>${step.title}</strong>
          <small>${step.note}</small>
        </div>
      `;
    })
    .join("");
}

function renderActions() {
  const upcoming = nextStep();
  const buttons = [];

  if (loan.status === "ClaimRequested") {
    const canCompensate = selectedRole === "guarantor";
    buttons.push(`<button class="primary-button" data-action="compensate" ${canCompensate ? "" : "disabled"} type="button">执行代偿</button>`);
  } else if (upcoming && loan.status !== "Rejected") {
    const canAct = selectedRole === upcoming.actor;
    buttons.push(`<button class="primary-button" data-action="advance" ${canAct ? "" : "disabled"} type="button">${upcoming.action}</button>`);
  }

  if (loan.status === "BankFunded") {
    buttons.push(`<button class="secondary-button" data-action="claim" ${selectedRole === "bank" ? "" : "disabled"} type="button">触发逾期赔付</button>`);
  }

  if (["Applied", "BuyerEndorsed", "GuaranteeApproved"].includes(loan.status) && selectedRole !== "farmer") {
    buttons.push(`<button class="secondary-button" data-action="reject" type="button">驳回</button>`);
  }

  if (!buttons.length) buttons.push(`<button class="secondary-button" disabled type="button">当前无待办</button>`);
  actionRow.innerHTML = buttons.join("");

  actionRow.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      if (action === "advance") actOnStep(nextStep());
      if (action === "claim") requestClaim();
      if (action === "compensate") actOnStep(steps[5]);
      if (action === "reject") rejectCurrent();
    });
  });
}

function renderTimeline() {
  timeline.innerHTML = loan.events
    .map((event) => `
      <li class="${event.tone}">
        <strong>${event.title}</strong>
        <small>${event.detail}</small>
        <small>${event.at}</small>
      </li>
    `)
    .join("");
  eventCount.textContent = loan.events.length;
}

function renderMetrics() {
  metricStatus.textContent = statusLabel();
  exposureValue.textContent = `${exposureAmount().toFixed(2)} INJ`;
}

function render() {
  renderRoles();
  renderSteps();
  renderActions();
  renderTimeline();
  renderMetrics();
}

resetButton.addEventListener("click", reset);

if (!loan.events.length) {
  addEvent("DemoReady", "融资担保流程已初始化，等待农户提交融资申请。", "warn");
  saveLoan();
}

render();
