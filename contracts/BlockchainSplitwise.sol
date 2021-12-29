// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

contract BlockchainSplitwise {

  // Your goal is to write a contract that minimize the amount of storage and
  // computation used by both contract functions. This will minimize gas costs.

  // debtor => creditor
  mapping(address => mapping (address => uint32)) private ledger;

  // Returns the amount that the debtor owes the creditor.
  function lookup(address debtor, address creditor) public view returns (uint32 ret) {
    return ledger[debtor][creditor];
  }

  // Informs the contract that msg.sender
  // now owes amount more dollars to creditor. It is additive: if you already owed money, this
  // will add to that. The amount must be positive. You can make this function take any number
  // of additional arguments. See note about resolving loops below
  function addIOU(address creditor, uint32 amount, address[] memory path) external {
    require(amount > 0);

    if (path.length > 0) {
      // ‘resolve’ any cycles in this graph by subtracting the
      // minimum of all the weights in the cycle from every step in the cycle (thereby making at least one
      // step in the cycle have weight ‘0’)
      uint32 minWeight = amount;

      // find min
      for (uint i = 1; i < path.length; i++) {
        address from = path[i-1];
        address to = path[i];
        uint32 amt = lookup(from, to);

        if (amt < minWeight) {
          minWeight = amt;
        }
      }

      for (uint i = 1; i < path.length; i++) {
        address from = path[i-1];
        address to = path[i];
        ledger[from][to] -= minWeight;
      }

      amount -= minWeight;
    }

    if (amount == 0) {
      return;
    }

    ledger[msg.sender][creditor] += amount;
  }
}
