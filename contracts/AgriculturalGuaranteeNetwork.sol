// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AgriculturalGuaranteeNetwork
/// @notice A compact state machine for agricultural finance guarantee demos on Injective EVM.
contract AgriculturalGuaranteeNetwork {
    enum LoanStatus {
        Applied,
        BuyerEndorsed,
        GuaranteeApproved,
        BankFunded,
        Repaid,
        ClaimRequested,
        Compensated,
        Defaulted,
        Rejected,
        Cancelled
    }

    struct Loan {
        uint256 id;
        address farmer;
        address buyer;
        address guarantor;
        address bank;
        string crop;
        string locationName;
        string metadataURI;
        uint256 principal;
        uint16 interestRateBps;
        uint16 guaranteeFeeBps;
        uint16 guaranteeCoverageBps;
        uint32 tenorDays;
        uint256 createdAt;
        uint256 fundedAt;
        uint256 dueAt;
        uint256 repaidAmount;
        uint256 compensationAmount;
        LoanStatus status;
    }

    struct Actor {
        string name;
        string roleName;
        bool active;
    }

    address public immutable admin;
    uint256 public nextLoanId = 1;

    mapping(address => Actor) public actors;
    mapping(uint256 => Loan) private loans;
    mapping(uint256 => string[]) private auditNotes;

    event ActorRegistered(address indexed account, string name, string roleName);
    event LoanApplied(uint256 indexed loanId, address indexed farmer, uint256 principal, string crop);
    event BuyerEndorsed(uint256 indexed loanId, address indexed buyer, string note);
    event GuaranteeApproved(uint256 indexed loanId, address indexed guarantor, uint16 coverageBps, uint16 feeBps);
    event BankFunded(uint256 indexed loanId, address indexed bank, uint256 amount, uint256 dueAt);
    event LoanRepaid(uint256 indexed loanId, address indexed payer, uint256 amount, uint256 totalRepaid);
    event ClaimRequested(uint256 indexed loanId, address indexed bank, uint256 shortfall);
    event ClaimCompensated(uint256 indexed loanId, address indexed guarantor, uint256 amount);
    event LoanRejected(uint256 indexed loanId, address indexed actor, string reason);
    event LoanCancelled(uint256 indexed loanId, address indexed farmer);
    event AuditNoteAdded(uint256 indexed loanId, address indexed actor, string note);

    modifier onlyAdmin() {
        require(msg.sender == admin, "not admin");
        _;
    }

    modifier onlyLoanActor(uint256 loanId) {
        Loan storage loan = loans[loanId];
        require(
            msg.sender == loan.farmer ||
                msg.sender == loan.buyer ||
                msg.sender == loan.guarantor ||
                msg.sender == loan.bank,
            "not loan actor"
        );
        _;
    }

    constructor() {
        admin = msg.sender;
        actors[msg.sender] = Actor("Network admin", "admin", true);
    }

    function registerActor(address account, string calldata name, string calldata roleName) external onlyAdmin {
        require(account != address(0), "zero account");
        actors[account] = Actor(name, roleName, true);
        emit ActorRegistered(account, name, roleName);
    }

    function applyForLoan(
        address buyer,
        address guarantor,
        address bank,
        string calldata crop,
        string calldata locationName,
        string calldata metadataURI,
        uint256 principal,
        uint16 interestRateBps,
        uint16 guaranteeFeeBps,
        uint16 guaranteeCoverageBps,
        uint32 tenorDays
    ) external returns (uint256 loanId) {
        require(buyer != address(0) && guarantor != address(0) && bank != address(0), "missing actor");
        require(principal > 0, "principal required");
        require(tenorDays > 0, "tenor required");
        require(guaranteeCoverageBps <= 10000, "bad coverage");
        require(interestRateBps <= 5000, "rate too high");

        loanId = nextLoanId++;
        loans[loanId] = Loan({
            id: loanId,
            farmer: msg.sender,
            buyer: buyer,
            guarantor: guarantor,
            bank: bank,
            crop: crop,
            locationName: locationName,
            metadataURI: metadataURI,
            principal: principal,
            interestRateBps: interestRateBps,
            guaranteeFeeBps: guaranteeFeeBps,
            guaranteeCoverageBps: guaranteeCoverageBps,
            tenorDays: tenorDays,
            createdAt: block.timestamp,
            fundedAt: 0,
            dueAt: 0,
            repaidAmount: 0,
            compensationAmount: 0,
            status: LoanStatus.Applied
        });

        emit LoanApplied(loanId, msg.sender, principal, crop);
    }

    function buyerEndorse(uint256 loanId, string calldata note) external {
        Loan storage loan = loans[loanId];
        require(msg.sender == loan.buyer, "only buyer");
        require(loan.status == LoanStatus.Applied, "bad status");

        loan.status = LoanStatus.BuyerEndorsed;
        auditNotes[loanId].push(note);
        emit BuyerEndorsed(loanId, msg.sender, note);
        emit AuditNoteAdded(loanId, msg.sender, note);
    }

    function approveGuarantee(uint256 loanId, string calldata note) external {
        Loan storage loan = loans[loanId];
        require(msg.sender == loan.guarantor, "only guarantor");
        require(loan.status == LoanStatus.BuyerEndorsed, "bad status");

        loan.status = LoanStatus.GuaranteeApproved;
        auditNotes[loanId].push(note);
        emit GuaranteeApproved(loanId, msg.sender, loan.guaranteeCoverageBps, loan.guaranteeFeeBps);
        emit AuditNoteAdded(loanId, msg.sender, note);
    }

    function fundLoan(uint256 loanId, string calldata note) external payable {
        Loan storage loan = loans[loanId];
        require(msg.sender == loan.bank, "only bank");
        require(loan.status == LoanStatus.GuaranteeApproved, "bad status");
        require(msg.value == loan.principal, "principal mismatch");

        loan.status = LoanStatus.BankFunded;
        loan.fundedAt = block.timestamp;
        loan.dueAt = block.timestamp + uint256(loan.tenorDays) * 1 days;
        auditNotes[loanId].push(note);

        (bool sent, ) = loan.farmer.call{value: msg.value}("");
        require(sent, "farmer transfer failed");

        emit BankFunded(loanId, msg.sender, msg.value, loan.dueAt);
        emit AuditNoteAdded(loanId, msg.sender, note);
    }

    function repayLoan(uint256 loanId) external payable {
        Loan storage loan = loans[loanId];
        require(msg.sender == loan.farmer, "only farmer");
        require(loan.status == LoanStatus.BankFunded || loan.status == LoanStatus.ClaimRequested, "bad status");
        require(msg.value > 0, "payment required");

        loan.repaidAmount += msg.value;

        (bool sent, ) = loan.bank.call{value: msg.value}("");
        require(sent, "bank transfer failed");

        if (loan.repaidAmount >= payoffAmount(loanId)) {
            loan.status = LoanStatus.Repaid;
        }

        emit LoanRepaid(loanId, msg.sender, msg.value, loan.repaidAmount);
    }

    function requestClaim(uint256 loanId, string calldata note) external {
        Loan storage loan = loans[loanId];
        require(msg.sender == loan.bank, "only bank");
        require(loan.status == LoanStatus.BankFunded, "bad status");
        require(block.timestamp > loan.dueAt, "not overdue");
        require(loan.repaidAmount < payoffAmount(loanId), "no shortfall");

        loan.status = LoanStatus.ClaimRequested;
        auditNotes[loanId].push(note);

        emit ClaimRequested(loanId, msg.sender, payoffAmount(loanId) - loan.repaidAmount);
        emit AuditNoteAdded(loanId, msg.sender, note);
    }

    function compensateClaim(uint256 loanId, string calldata note) external payable {
        Loan storage loan = loans[loanId];
        require(msg.sender == loan.guarantor, "only guarantor");
        require(loan.status == LoanStatus.ClaimRequested, "bad status");
        require(msg.value > 0, "payment required");

        uint256 requiredCompensation = guaranteeExposure(loanId);
        require(msg.value >= requiredCompensation, "below exposure");

        loan.compensationAmount += msg.value;
        loan.status = LoanStatus.Compensated;
        auditNotes[loanId].push(note);

        (bool sent, ) = loan.bank.call{value: msg.value}("");
        require(sent, "bank transfer failed");

        emit ClaimCompensated(loanId, msg.sender, msg.value);
        emit AuditNoteAdded(loanId, msg.sender, note);
    }

    function markDefaulted(uint256 loanId, string calldata note) external {
        Loan storage loan = loans[loanId];
        require(msg.sender == loan.bank || msg.sender == loan.guarantor, "only risk side");
        require(loan.status == LoanStatus.ClaimRequested, "bad status");

        loan.status = LoanStatus.Defaulted;
        auditNotes[loanId].push(note);
        emit AuditNoteAdded(loanId, msg.sender, note);
    }

    function rejectLoan(uint256 loanId, string calldata reason) external onlyLoanActor(loanId) {
        Loan storage loan = loans[loanId];
        require(
            loan.status == LoanStatus.Applied ||
                loan.status == LoanStatus.BuyerEndorsed ||
                loan.status == LoanStatus.GuaranteeApproved,
            "cannot reject"
        );
        require(msg.sender != loan.farmer, "farmer cannot reject");

        loan.status = LoanStatus.Rejected;
        auditNotes[loanId].push(reason);
        emit LoanRejected(loanId, msg.sender, reason);
        emit AuditNoteAdded(loanId, msg.sender, reason);
    }

    function cancelLoan(uint256 loanId) external {
        Loan storage loan = loans[loanId];
        require(msg.sender == loan.farmer, "only farmer");
        require(loan.status == LoanStatus.Applied, "cannot cancel");

        loan.status = LoanStatus.Cancelled;
        emit LoanCancelled(loanId, msg.sender);
    }

    function payoffAmount(uint256 loanId) public view returns (uint256) {
        Loan storage loan = loans[loanId];
        uint256 interest = (loan.principal * loan.interestRateBps * loan.tenorDays) / 365 / 10000;
        return loan.principal + interest;
    }

    function guaranteeExposure(uint256 loanId) public view returns (uint256) {
        Loan storage loan = loans[loanId];
        uint256 shortfall = payoffAmount(loanId) > loan.repaidAmount ? payoffAmount(loanId) - loan.repaidAmount : 0;
        return (shortfall * loan.guaranteeCoverageBps) / 10000;
    }

    function getLoan(uint256 loanId) external view returns (Loan memory) {
        require(loans[loanId].id != 0, "loan not found");
        return loans[loanId];
    }

    function getAuditNotes(uint256 loanId) external view returns (string[] memory) {
        require(loans[loanId].id != 0, "loan not found");
        return auditNotes[loanId];
    }
}
