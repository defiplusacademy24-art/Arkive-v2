// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ArkiveVault
 * @notice Crypto inheritance vault on Arc Network.
 *         Users deposit USDC, set beneficiaries with percentage allocations,
 *         and appoint guardians who must approve transfers. When the protocol
 *         triggers, assets are distributed automatically based on allocations.
 *
 * Deployed on:  Arc Testnet (chainId 5042002)
 * USDC address: 0x3600000000000000000000000000000000000000
 *
 * Flow:
 *   1. User calls deposit() after approving this contract to spend USDC.
 *   2. User calls setBeneficiaries() — percentages must sum to exactly 10000 bps (100%).
 *   3. User calls setGuardians() — sets trusted signers + required approval count.
 *   4. Offchain: inactivity detected → initiateTransfer() is called.
 *   5. Guardians call approveTransfer(vaultOwner).
 *   6. After delay + enough approvals, anyone calls executeTransfer(vaultOwner).
 *   7. Assets are distributed to beneficiary wallets by their bps share.
 *   8. At any point before execution, vault owner calls abortTransfer() (panic reset).
 */

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
}

contract ArkiveVault {
    // ─── State ──────────────────────────────────────────────────────────────

    address public immutable usdc;

    struct Beneficiary {
        address wallet;
        string  name;
        uint16  basisPoints; // 100 bps = 1%, 10000 bps = 100%
    }

    struct Guardian {
        address wallet;
        string  name;
        bool    hasApproved;
    }

    struct UserVault {
        uint256       balance;
        uint256       requiredApprovals;   // min guardian approvals to execute
        bool          transferInitiated;
        uint256       transferInitiatedAt;
        uint256       transferDelaySeconds; // time-lock before execution
        Beneficiary[] beneficiaries;
        Guardian[]    guardians;
    }

    mapping(address => UserVault) private _vaults;

    // ─── Events ─────────────────────────────────────────────────────────────

    event Deposited(address indexed user, uint256 amount, uint256 newBalance);
    event BeneficiariesSet(address indexed user, uint256 count);
    event GuardiansSet(address indexed user, uint256 count, uint256 requiredApprovals);
    event TransferInitiated(address indexed user, uint256 initiatedAt, uint256 executeAfter);
    event GuardianApproved(address indexed vaultOwner, address indexed guardian);
    event TransferExecuted(address indexed vaultOwner, address indexed beneficiary, string name, uint256 amount);
    event TransferAborted(address indexed user);
    event Withdrawn(address indexed user, uint256 amount);

    // ─── Errors ─────────────────────────────────────────────────────────────

    error ZeroAmount();
    error TransferFailed();
    error AlreadyInitiated();
    error NoBeneficiaries();
    error NotInitiated();
    error DelayNotElapsed(uint256 endsAt);
    error InsufficientApprovals(uint256 have, uint256 need);
    error NotAGuardian();
    error AllocationMustBe100Percent();
    error NotEnoughGuardians();
    error NoActiveTransfer();
    error InsufficientBalance();
    error LengthMismatch();

    // ─── Constructor ─────────────────────────────────────────────────────────

    constructor(address _usdc) {
        usdc = _usdc;
    }

    // ─── User Actions ────────────────────────────────────────────────────────

    /**
     * @notice Deposit USDC into your vault.
     *         Caller must first approve this contract: usdc.approve(vaultAddress, amount)
     */
    function deposit(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        if (!IERC20(usdc).transferFrom(msg.sender, address(this), amount)) revert TransferFailed();
        _vaults[msg.sender].balance += amount;
        emit Deposited(msg.sender, amount, _vaults[msg.sender].balance);
    }

    /**
     * @notice Set your beneficiaries.
     *         All basis-point values must sum to exactly 10000 (= 100%).
     * @param wallets       Beneficiary wallet addresses
     * @param names         Beneficiary display names
     * @param basisPoints   Share in bps (e.g. 5000 = 50%, 2500 = 25%)
     */
    function setBeneficiaries(
        address[] calldata wallets,
        string[]  calldata names,
        uint16[]  calldata basisPoints
    ) external {
        if (wallets.length != names.length || names.length != basisPoints.length)
            revert LengthMismatch();

        uint256 total;
        for (uint256 i; i < basisPoints.length; ++i) total += basisPoints[i];
        if (total != 10000) revert AllocationMustBe100Percent();

        UserVault storage v = _vaults[msg.sender];
        delete v.beneficiaries;
        for (uint256 i; i < wallets.length; ++i) {
            v.beneficiaries.push(Beneficiary(wallets[i], names[i], basisPoints[i]));
        }
        emit BeneficiariesSet(msg.sender, wallets.length);
    }

    /**
     * @notice Set your guardians and approval threshold.
     * @param wallets           Guardian wallet addresses
     * @param names             Guardian display names
     * @param requiredApprovals Minimum approvals required (e.g. 2 for "2 of 3")
     * @param delaySeconds      Time-lock: seconds after initiation before execution
     */
    function setGuardians(
        address[] calldata wallets,
        string[]  calldata names,
        uint256 requiredApprovals,
        uint256 delaySeconds
    ) external {
        if (wallets.length != names.length) revert LengthMismatch();
        if (wallets.length < requiredApprovals) revert NotEnoughGuardians();

        UserVault storage v = _vaults[msg.sender];
        delete v.guardians;
        for (uint256 i; i < wallets.length; ++i) {
            v.guardians.push(Guardian(wallets[i], names[i], false));
        }
        v.requiredApprovals    = requiredApprovals;
        v.transferDelaySeconds = delaySeconds;
        emit GuardiansSet(msg.sender, wallets.length, requiredApprovals);
    }

    /**
     * @notice Abort a pending transfer (Panic Reset).
     *         Resets the transfer and restores system to active status.
     */
    function abortTransfer() external {
        UserVault storage v = _vaults[msg.sender];
        if (!v.transferInitiated) revert NotInitiated();
        v.transferInitiated = false;
        v.transferInitiatedAt = 0;
        for (uint256 i; i < v.guardians.length; ++i) {
            v.guardians[i].hasApproved = false;
        }
        emit TransferAborted(msg.sender);
    }

    /**
     * @notice Withdraw your entire vault balance back to your wallet.
     *         Can only be called when no transfer is initiated.
     */
    function withdraw() external {
        UserVault storage v = _vaults[msg.sender];
        if (v.transferInitiated) revert AlreadyInitiated();
        uint256 bal = v.balance;
        if (bal == 0) revert InsufficientBalance();
        v.balance = 0;
        if (!IERC20(usdc).transfer(msg.sender, bal)) revert TransferFailed();
        emit Withdrawn(msg.sender, bal);
    }

    // ─── Protocol Actions (called by Arkive backend / guardians) ─────────────

    /**
     * @notice Initiate a transfer for a vault owner (called when inactivity detected).
     *         Resets all guardian approval flags.
     */
    function initiateTransfer(address vaultOwner) external {
        UserVault storage v = _vaults[vaultOwner];
        if (v.transferInitiated) revert AlreadyInitiated();
        if (v.beneficiaries.length == 0) revert NoBeneficiaries();

        v.transferInitiated   = true;
        v.transferInitiatedAt = block.timestamp;

        for (uint256 i; i < v.guardians.length; ++i) {
            v.guardians[i].hasApproved = false;
        }
        emit TransferInitiated(vaultOwner, block.timestamp, block.timestamp + v.transferDelaySeconds);
    }

    /**
     * @notice Guardian approves a pending transfer for a vault owner.
     */
    function approveTransfer(address vaultOwner) external {
        UserVault storage v = _vaults[vaultOwner];
        if (!v.transferInitiated) revert NotInitiated();

        for (uint256 i; i < v.guardians.length; ++i) {
            if (v.guardians[i].wallet == msg.sender) {
                v.guardians[i].hasApproved = true;
                emit GuardianApproved(vaultOwner, msg.sender);
                return;
            }
        }
        revert NotAGuardian();
    }

    /**
     * @notice Execute a pending transfer after delay + sufficient approvals.
     *         Distributes vault balance to beneficiaries by their allocation.
     *         Anyone can call this once conditions are met.
     */
    function executeTransfer(address vaultOwner) external {
        UserVault storage v = _vaults[vaultOwner];
        if (!v.transferInitiated) revert NotInitiated();

        uint256 endsAt = v.transferInitiatedAt + v.transferDelaySeconds;
        if (block.timestamp < endsAt) revert DelayNotElapsed(endsAt);

        uint256 approvals;
        for (uint256 i; i < v.guardians.length; ++i) {
            if (v.guardians[i].hasApproved) ++approvals;
        }
        if (approvals < v.requiredApprovals)
            revert InsufficientApprovals(approvals, v.requiredApprovals);

        uint256 total = v.balance;
        v.balance           = 0;
        v.transferInitiated = false;

        for (uint256 i; i < v.beneficiaries.length; ++i) {
            Beneficiary memory ben = v.beneficiaries[i];
            uint256 share = (total * ben.basisPoints) / 10000;
            if (share > 0) {
                IERC20(usdc).transfer(ben.wallet, share);
                emit TransferExecuted(vaultOwner, ben.wallet, ben.name, share);
            }
        }
    }

    // ─── View Functions ──────────────────────────────────────────────────────

    function getVaultBalance(address user) external view returns (uint256) {
        return _vaults[user].balance;
    }

    function getVaultStatus(address user) external view returns (
        uint256 balance,
        bool    transferInitiated,
        uint256 transferInitiatedAt,
        uint256 transferDelaySeconds,
        uint256 requiredApprovals,
        uint256 approvalCount,
        uint256 beneficiaryCount,
        uint256 guardianCount
    ) {
        UserVault storage v = _vaults[user];
        uint256 aCount;
        for (uint256 i; i < v.guardians.length; ++i) {
            if (v.guardians[i].hasApproved) ++aCount;
        }
        return (
            v.balance,
            v.transferInitiated,
            v.transferInitiatedAt,
            v.transferDelaySeconds,
            v.requiredApprovals,
            aCount,
            v.beneficiaries.length,
            v.guardians.length
        );
    }

    function getBeneficiary(address user, uint256 index) external view returns (
        address wallet, string memory name, uint16 basisPoints
    ) {
        Beneficiary memory b = _vaults[user].beneficiaries[index];
        return (b.wallet, b.name, b.basisPoints);
    }

    function getGuardian(address user, uint256 index) external view returns (
        address wallet, string memory name, bool hasApproved
    ) {
        Guardian memory g = _vaults[user].guardians[index];
        return (g.wallet, g.name, g.hasApproved);
    }

    function canExecute(address user) external view returns (bool) {
        UserVault storage v = _vaults[user];
        if (!v.transferInitiated) return false;
        if (block.timestamp < v.transferInitiatedAt + v.transferDelaySeconds) return false;
        uint256 approvals;
        for (uint256 i; i < v.guardians.length; ++i) {
            if (v.guardians[i].hasApproved) ++approvals;
        }
        return approvals >= v.requiredApprovals;
    }
}
