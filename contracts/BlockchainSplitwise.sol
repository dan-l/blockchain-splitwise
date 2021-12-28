// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

contract BlockchainSplitwise {

  // debtor => creditor
  mapping(address => mapping (address => uint32)) private ledger;

  // debtor => owed amount, since we cannot iterate over all keys in mapping to sum up
  mapping(address => uint32) debtorToOwedAmount;

  // ‘everyone who has ever sent or received an IOU’
  address[] users;
  // solidity doesn't have contains, so we track manually
  mapping (address => bool) isUser;

  // a UNIX timestamp (seconds since Jan 1, 1970)
  // last recorded activity of this user (either sending an IOU or being listed as ’creditor’
  // on an IOU).
  mapping (address => uint) lastActivity;

  // Returns the amount that the debtor owes the creditor.
  function lookup(address debtor, address creditor) public view returns (uint32 ret) {
    return ledger[debtor][creditor];
  }

  // Informs the contract that msg.sender
  // now owes amount more dollars to creditor. It is additive: if you already owed money, this
  // will add to that. The amount must be positive. You can make this function take any number
  // of additional arguments. See note about resolving loops below
  function addIOU(address creditor, uint32 amount) external {
    require(amount > 0);

    ledger[msg.sender][creditor] += amount;
    debtorToOwedAmount[msg.sender] += amount;

    // record users
    if(!isUser[msg.sender]) {
      users.push(msg.sender);
    }
    if (!isUser[creditor]) {
      users.push(creditor);
    }
    isUser[msg.sender] = true;
    isUser[creditor] = true;

    // record timestamp
    lastActivity[msg.sender] = block.timestamp;
    lastActivity[creditor] = block.timestamp;
  }

  function getAmountOwed(address debtor) public view returns (uint32 ret) {
    return debtorToOwedAmount[debtor];
  }

  // users is in the contact storage and we cannot return as is
  // load in memory and return a view only
  function getUsers() public view returns (address[] memory ret) {
    return users;
  }

  function getLastActivity(address user) public view returns (uint ret) {
    return lastActivity[user];
  }
}
