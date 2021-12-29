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
    });

  });

  describe('Transaction', async function() {
     it('Should be able to add IOUs', async function() {
      // connect as addr1
      splitwise = splitwise.connect(addr1);
      
      // addr1 owes owner 10
      await splitwise.addIOU(owner.getAddress(), 10, []);
      expect(await splitwise.lookup(addr1.getAddress(), owner.getAddress())).to.equal(10);
    });

    it('Should be able to calculate IOUs as additive', async function() {
      // connect as addr1
      splitwise = splitwise.connect(addr1);
      
      // addr1 owes owner
      await splitwise.addIOU(owner.getAddress(), 10, []);
      await splitwise.addIOU(owner.getAddress(), 20, []);
      expect(await splitwise.lookup(addr1.getAddress(), owner.getAddress())).to.equal(30);
    });

    it('Should not be able to add negative IOU', async function() {
      await expect(splitwise.addIOU(owner.getAddress(), -10, [])).to.be.reverted;
    });

    it('Should be able to add IOUs with loop', async function() {
      // owner -> addr1, there is no existing path from addr1 -> owner
      await splitwise.addIOU(addr1.getAddress(), 10, []);
      expect(await splitwise.lookup(owner.getAddress(), addr1.getAddress())).to.equal(10);

      // addr1 -> addr2, there is no existing path from addr2 -> addr1
      await splitwise.connect(addr1).addIOU(addr2.getAddress(), 20, []);
      expect(await splitwise.lookup(addr1.getAddress(), addr2.getAddress())).to.equal(20);

      // addr2 -> owner, there is existing path from owner -> addr2
      path = [owner.getAddress(), addr1.getAddress(), addr2.getAddress()];
      await splitwise.connect(addr2).addIOU(owner.getAddress(), 30, path);
      expect(await splitwise.lookup(owner.getAddress(), addr1.getAddress())).to.equal(0);
      expect(await splitwise.lookup(addr1.getAddress(), addr2.getAddress())).to.equal(10);
      expect(await splitwise.lookup(addr2.getAddress(), owner.getAddress())).to.equal(20);
    });

  });
});
