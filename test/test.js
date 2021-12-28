const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BlockchainSplitwise", function () {
  let splitwiseContract;
  let splitwise;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  beforeEach(async function() {
    splitwiseContract = await ethers.getContractFactory('BlockchainSplitwise');
    splitwise = await splitwiseContract.deploy();

    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
  });


  describe('Deployment', async function() {
    it('Should start with an empty IOUs', async function () {
      expect(await splitwise.lookup(owner.getAddress(), addr1.getAddress())).to.equal(0);
      expect(await splitwise.lookup(addr1.getAddress(), owner.getAddress())).to.equal(0);
      expect((await splitwise.getUsers()).length).to.equal(0);
      const ownerLastActivity = await splitwise.getLastActivity(owner.getAddress());
      expect(ownerLastActivity.toNumber()).to.equal(0);
      const addr1LastActivity = await splitwise.getLastActivity(addr1.getAddress());
      expect(addr1LastActivity.toNumber()).to.equal(0);
    });

  });

  describe('Transaction', async function() {
     it('Should be able to add IOUs', async function() {
      // connect as addr1
      splitwise = splitwise.connect(addr1);
      
      // addr1 owes owner 10
      await splitwise.addIOU(owner.getAddress(), 10);
      expect(await splitwise.lookup(addr1.getAddress(), owner.getAddress())).to.equal(10);
      
      // registered users
      const users = await splitwise.getUsers();
      const expectedUsers = [
        await owner.getAddress(), 
        await addr1.getAddress()
      ];
      expect(users).to.include.members(expectedUsers);
      expect(users.length).to.equal(2);

      // activity
      const ownerLastActivity = await splitwise.getLastActivity(owner.getAddress());
      expect(ownerLastActivity.toNumber()).to.be.above(0);
      const addr1LastActivity = await splitwise.getLastActivity(addr1.getAddress());
      expect(addr1LastActivity.toNumber()).to.be.above(0);
    });

    it('Should be able to calculate IOUs as additive', async function() {
      // connect as addr1
      splitwise = splitwise.connect(addr1);
      
      // addr1 owes owner
      await splitwise.addIOU(owner.getAddress(), 10);
      await splitwise.addIOU(owner.getAddress(), 20);
      expect(await splitwise.lookup(addr1.getAddress(), owner.getAddress())).to.equal(30);

      // registered users
      const users = await splitwise.getUsers();
      const expectedUsers = [
        await owner.getAddress(), 
        await addr1.getAddress()
      ];
      expect(users).to.include.members(expectedUsers);
      expect(users.length).to.equal(2);

      // activity
      const ownerLastActivity = await splitwise.getLastActivity(owner.getAddress());
      expect(ownerLastActivity.toNumber()).to.be.above(0);
      const addr1LastActivity = await splitwise.getLastActivity(addr1.getAddress());
      expect(addr1LastActivity.toNumber()).to.be.above(0);
    });

    it('Should be able to get total amount owed for debtor', async function() {
      // owner owes addr1
      await splitwise.addIOU(addr1.getAddress(), 10);
      expect(await splitwise.lookup(owner.getAddress(), addr1.getAddress())).to.equal(10);
      // owner owes addr2
      await splitwise.addIOU(addr2.getAddress(), 20);
      expect(await splitwise.lookup(owner.getAddress(), addr2.getAddress())).to.equal(20);

      expect(await splitwise.getAmountOwed(owner.getAddress())).to.equal(30);

      // registered users
      const users = await splitwise.getUsers();
      const expectedUsers = [
        await owner.getAddress(), 
        await addr1.getAddress(),
        await addr2.getAddress()
      ];
      expect(users).to.include.members(expectedUsers);
      expect(users.length).to.equal(3);

      // activity
      const addr1LastActivity = await splitwise.getLastActivity(addr1.getAddress());
      expect(addr1LastActivity.toNumber()).to.be.above(0);
      const ownerLastActivity = await splitwise.getLastActivity(owner.getAddress());
      expect(ownerLastActivity.toNumber()).to.be.above(addr1LastActivity);
      const addr2LastActivity = await splitwise.getLastActivity(addr2.getAddress());
      expect(addr2LastActivity.toNumber()).to.be.above(addr1LastActivity);
    });

  });
});
