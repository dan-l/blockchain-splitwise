# Blockchain Splitwise 

Following https://cs251.stanford.edu/hw/proj2.pdf 

### Project
The project has two major components: 
- a smart contract, written in Solidity and running on
the blockchain, 
- a client running locally in a web browser, that observes the blockchain using
web3.js and can call functions in the smart contract

#### Note
Avoid too much computation and storage on the smart contract to lower the gas fee needed for interaction.

### Dev
```
// setup hardhat
npm install --save-dev hardhat
npx hardhat

// start up webserver
python -m http.server 3000

// deploy contract
npx hardhat run --network localhost scripts/deploy.js

// start a local ETH node
ganache-cli
```
