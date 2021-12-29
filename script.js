// =============================================================================
//                                  Config
// =============================================================================
let web3 = new Web3("ws://localhost:8545" || Web3.givenProvider);

// Constant we use later
var GENESIS = '0x0000000000000000000000000000000000000000000000000000000000000000';

// This is the ABI for your contract (get it from Remix, in the 'Compile' tab)
// ============================================================
var abi = [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "creditor",
          "type": "address"
        },
        {
          "internalType": "uint32",
          "name": "amount",
          "type": "uint32"
        },
        {
          "internalType": "address[]",
          "name": "path",
          "type": "address[]"
        }
      ],
      "name": "addIOU",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "debtor",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "creditor",
          "type": "address"
        }
      ],
      "name": "lookup",
      "outputs": [
        {
          "internalType": "uint32",
          "name": "ret",
          "type": "uint32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ];

// ============================================================
abiDecoder.addABI(abi);
// call abiDecoder.decodeMethod to use this - see 'getAllFunctionCalls' for more

var contractAddress = '0xb5729724AB67773839F118Aa8533A4Ed9fDD8CCA';
var BlockchainSplitwise = new web3.eth.Contract(abi, contractAddress);

// =============================================================================
//                            Functions To Implement
// =============================================================================

// TODO: Add any helper functions here!

// TODO: Return a list of all users (creditors or debtors) in the system
// You can return either:
//   - a list of everyone who has ever sent or received an IOU
// OR
//   - a list of everyone currently owing or being owed money
async function getUsers() {
  // You can assume that the transaction volume is small enough that it’s feasible to search the
  // whole blockchain on the client,
  const calls = await getAllFunctionCalls(contractAddress, 'addIOU');
  
  const usersSet = calls.reduce((users, { from, args }) => {
    const [to, _] = args;
    users.add(from);
    users.add(to);
    return users;
  }, new Set());

  return Array.from(usersSet);
}

// TODO: Get the total amount owed by the user specified by 'user'
async function getTotalOwed(user) {
  const creditors = await getUsers();
  
  const creditorsData = await getCreditors(user);
  return creditorsData.reduce((totalOwed, { amt }) => {
    totalOwed += amt;
    return totalOwed;
  }, 0);
}

// TODO: Get the last time this user has sent or received an IOU, in seconds since Jan. 1, 1970
// Return null if you can't find any activity for the user.
// HINT: Try looking at the way 'getAllFunctionCalls' is written. You can modify it if you'd like.
async function getLastActive(user) {
  const calls = await getAllFunctionCalls(contractAddress, 'addIOU');
  const userCall = calls.find(({ from, args, t}) => {
    // either a debtor or creditor
    if (from.toLowerCase() === user.toLowerCase() || args[0].toLowerCase() === user.toLowerCase()) {
      return true;
    }
  });

  return userCall ? userCall.t : null;
}

// get addresses of all the creditors of the user
async function getNeighbors(user) {
  const creditorToAmount = await getCreditors(user);
  return creditorToAmount.map(({ creditor }) => creditor);
}

// figure out all the creditors of user and the amount owed to each of them by doing a lookup
async function getCreditors(user) {
  const creditors = await getUsers();
  // list of object { creditor: 0x123, amount: 1}
  const creditorToAmount = [];
  for (const creditor of creditors) {
    if (user !== creditor) {
      const response = await BlockchainSplitwise.methods.lookup(user, creditor).call({
        from: web3.eth.defaultAccount
      });
      const amt = Number(response);

      amt && creditorToAmount.push({
        creditor,
        amt
      }) 
    }
  }

  return creditorToAmount;
}

// TODO: add an IOU ('I owe you') to the system
// The person you owe money is passed as 'creditor'
// The amount you owe them is passed as 'amount'
async function add_IOU(creditor, amount) {
  const path = await doBFS(creditor, web3.eth.defaultAccount, getNeighbors) || [];
  return BlockchainSplitwise.methods.addIOU(creditor, amount, path).send({
    from: web3.eth.defaultAccount
  });
}

// =============================================================================
//                              Provided Functions
// =============================================================================
// Reading and understanding these should help you implement the above

// This searches the block history for all calls to 'functionName' (string) on the 'addressOfContract' (string) contract
// It returns an array of objects, one for each call, containing the sender ('from'), arguments ('args'), and the timestamp ('t')
async function getAllFunctionCalls(addressOfContract, functionName) {
	var curBlock = await web3.eth.getBlockNumber();
	var function_calls = [];

	while (curBlock !== GENESIS) {
	  var b = await web3.eth.getBlock(curBlock, true);
	  var txns = b.transactions;
	  for (var j = 0; j < txns.length; j++) {
	  	var txn = txns[j];

	  	// check that destination of txn is our contract
			if(txn.to == null){continue;}
	  	if (txn.to.toLowerCase() === addressOfContract.toLowerCase()) {
	  		var func_call = abiDecoder.decodeMethod(txn.input);

				// check that the function getting called in this txn is 'functionName'
				if (func_call && func_call.name === functionName) {
					var time = await web3.eth.getBlock(curBlock);
	  			var args = func_call.params.map(function (x) {return x.value});
	  			function_calls.push({
	  				from: txn.from.toLowerCase(),
	  				args: args,
						t: time.timestamp
	  			})
	  		}
	  	}
	  }
	  curBlock = b.parentHash;
	}
	return function_calls;
}

// We've provided a breadth-first search implementation for you, if that's useful
// It will find a path from start to end (or return null if none exists)
// You just need to pass in a function ('getNeighbors') that takes a node (string) and returns its neighbors (as an array)
async function doBFS(start, end, getNeighbors) {
	var queue = [[start]];
	while (queue.length > 0) {
		var cur = queue.shift();
		var lastNode = cur[cur.length-1]
		if (lastNode.toLowerCase() === end.toLowerCase()) {
			return cur;
		} else {
			var neighbors = await getNeighbors(lastNode);
			for (var i = 0; i < neighbors.length; i++) {
				queue.push(cur.concat([neighbors[i]]));
			}
		}
	}
	return null;
}

// =============================================================================
//                                      UI
// =============================================================================

// This sets the default account on load and displays the total owed to that
// account.
web3.eth.getAccounts().then((response)=> {
	web3.eth.defaultAccount = response[0];

	getTotalOwed(web3.eth.defaultAccount).then((response)=>{
		$("#total_owed").html("$"+response);
	});

	getLastActive(web3.eth.defaultAccount).then((response)=>{
		time = timeConverter(response);
		$("#last_active").html(time)
	});
});

// This code updates the 'My Account' UI with the results of your functions
$("#myaccount").change(function() {
	web3.eth.defaultAccount = $(this).val();

	getTotalOwed(web3.eth.defaultAccount).then((response)=>{
		$("#total_owed").html("$"+response);
	})

	getLastActive(web3.eth.defaultAccount).then((response)=>{
		time = timeConverter(response)
		$("#last_active").html(time)
	});
});

// Allows switching between accounts in 'My Account' and the 'fast-copy' in 'Address of person you owe
web3.eth.getAccounts().then((response)=>{
	var opts = response.map(function (a) { return '<option value="'+
			a.toLowerCase()+'">'+a.toLowerCase()+'</option>' });
	$(".account").html(opts);
	$(".wallet_addresses").html(response.map(function (a) { return '<li>'+a.toLowerCase()+'</li>' }));
});

// This code updates the 'Users' list in the UI with the results of your function
getUsers().then((response)=>{
	$("#all_users").html(response.map(function (u,i) { return "<li>"+u+"</li>" }));
});

// This runs the 'add_IOU' function when you click the button
// It passes the values from the two inputs above
$("#addiou").click(function() {
	web3.eth.defaultAccount = $("#myaccount").val(); //sets the default account
  add_IOU($("#creditor").val(), $("#amount").val()).then((response)=>{
		window.location.reload(true); // refreshes the page after add_IOU returns and the promise is unwrapped
	})
});

// This is a log function, provided if you want to display things to the page instead of the JavaScript console
// Pass in a discription of what you're printing, and then the object to print
function log(description, obj) {
	$("#log").html($("#log").html() + description + ": " + JSON.stringify(obj, null, 2) + "\n\n");
}


// =============================================================================
//                                      TESTING
// =============================================================================

// This section contains a sanity check test that you can use to ensure your code
// works. We will be testing your code this way, so make sure you at least pass
// the given test. You are encouraged to write more tests!

// Remember: the tests will assume that each of the four client functions are
// async functions and thus will return a promise. Make sure you understand what this means.

function check(name, condition) {
	if (condition) {
		console.log(name + ": SUCCESS");
		return 3;
	} else {
		console.log(name + ": FAILED");
		return 0;
	}
}

async function sanityCheck() {
	console.log ("\nTEST", "Simplest possible test: only runs one add_IOU; uses all client functions: lookup, getTotalOwed, getUsers, getLastActive");

	var score = 0;

	var accounts = await web3.eth.getAccounts();
	web3.eth.defaultAccount = accounts[0];

	var users = await getUsers();
	score += check("getUsers() initially empty", users.length === 0);

	var owed = await getTotalOwed(accounts[0]);
	score += check("getTotalOwed(0) initially empty", owed === 0);

	var lookup_0_1 = await BlockchainSplitwise.methods.lookup(accounts[0], accounts[1]).call({from:web3.eth.defaultAccount});
	score += check("lookup(0,1) initially 0", parseInt(lookup_0_1, 10) === 0);

	var response = await add_IOU(accounts[1], "10");

	users = await getUsers();
	score += check("getUsers() now length 2", users.length === 2);

	owed = await getTotalOwed(accounts[0]);
	score += check("getTotalOwed(0) now 10", owed === 10);

	lookup_0_1 = await BlockchainSplitwise.methods.lookup(accounts[0], accounts[1]).call({from:web3.eth.defaultAccount});
	score += check("lookup(0,1) now 10", parseInt(lookup_0_1, 10) === 10);

	var timeLastActive = await getLastActive(accounts[0]);
	var timeNow = Date.now()/1000;
	var difference = timeNow - timeLastActive;
	score += check("getLastActive(0) works", difference <= 60 && difference >= -3); // -3 to 60 seconds

	// console.log("Final Score: " + score +"/21");
    // Loop 3->4, 4->5, 5->3
  web3.eth.defaultAccount = accounts[3];
  var response = await add_IOU(accounts[4], "50");
  var lookup_3_4 = await BlockchainSplitwise.methods.lookup(accounts[3], accounts[4]).call({from:web3.eth.defaultAccount});
  score += check("lookup(3,4) now 50", parseInt(lookup_3_4, 10) === 50);
  
  web3.eth.defaultAccount = accounts[4];
  var response = await add_IOU(accounts[5], "50");
  var lookup_4_5 = await BlockchainSplitwise.methods.lookup(accounts[4], accounts[5]).call({from:web3.eth.defaultAccount});
  score += check("lookup(4,5) now 50", parseInt(lookup_4_5, 10) === 50);
  
  web3.eth.defaultAccount = accounts[5];
  var response = await add_IOU(accounts[3], "50");
  var lookup_5_3 = await BlockchainSplitwise.methods.lookup(accounts[5], accounts[3]).call({from:web3.eth.defaultAccount});
  score += check("Resolved loop: lookup(5,3) now 0", parseInt(lookup_5_3, 10) === 0);
  
  // END OF LOOP 1
  
  // loop 6->7, 7->8, 8->6
  web3.eth.defaultAccount = accounts[6];
  var response = await add_IOU(accounts[7], "50");
  var lookup_6_7 = await BlockchainSplitwise.methods.lookup(accounts[6], accounts[7]).call({from:web3.eth.defaultAccount});
  score += check("lookup(6,7) now 50", parseInt(lookup_6_7, 10) === 50);
  
  web3.eth.defaultAccount = accounts[7];
  var response = await add_IOU(accounts[8], "50");
  var lookup_7_8 = await BlockchainSplitwise.methods.lookup(accounts[7], accounts[8]).call({from:web3.eth.defaultAccount});
  score += check("lookup(7,8) now 50", parseInt(lookup_7_8, 10) === 50);
  
  web3.eth.defaultAccount = accounts[8];
  var response = await add_IOU(accounts[6], "40");
  var lookup_8_6 = await BlockchainSplitwise.methods.lookup(accounts[8], accounts[6]).call({from:web3.eth.defaultAccount});
  score += check("Resolved loop: lookup(8,6) now 0", parseInt(lookup_8_6, 10) === 0);
  
  // END OF LOOP 1

  // Verify the weight has been reduced from 50 to 10.
  lookup_6_7 = await BlockchainSplitwise.methods.lookup(accounts[6], accounts[7]).call({from:web3.eth.defaultAccount});
  score += check("lookup(6,7) now 10", parseInt(lookup_6_7, 10) === 10);
  
  lookup_7_8 = await BlockchainSplitwise.methods.lookup(accounts[7], accounts[8]).call({from:web3.eth.defaultAccount});
  score += check("lookup(7,8) now 10", parseInt(lookup_7_8, 10) === 10);
  
  console.log("Final Score: " + score +"/45");
}

sanityCheck() //Uncomment this line to run the sanity check when you first open index.html

async function testLoop() {
  let passed = 0;
  let owed = 0;

  const accounts = await web3.eth.getAccounts();

  // 0 -> (lookup_0_1+10) 1
  web3.eth.defaultAccount = accounts[0];
  // get existing balance
  const lookup_0_1 = await BlockchainSplitwise.methods.lookup(accounts[0], accounts[1]).call({from:web3.eth.defaultAccount});
  // add IOU
  await add_IOU(accounts[1], 10);
  // get balance owed
  owed = await getTotalOwed(accounts[0]);
  const updated_lookup_0_1 = Number(lookup_0_1) + 10;
  passed += check(`getTotalOwed(0) now ${updated_lookup_0_1}`, owed === updated_lookup_0_1) ? 1 : 0;

  // 1 -> (lookup_1_2 + 20) 2
  web3.eth.defaultAccount = accounts[1];
  const lookup_1_2 = await BlockchainSplitwise.methods.lookup(accounts[1], accounts[2]).call({from:web3.eth.defaultAccount});
  await add_IOU(accounts[2], 20);
  owed = await getTotalOwed(accounts[1]);
  const updated_lookup_1_2 = Number(lookup_1_2) + 20;
  passed += check(`getTotalOwed(1) now ${updated_lookup_1_2}`, owed === updated_lookup_1_2) ? 1 : 0;

  // 2 -> (lookup_2_3 + 30) 3
  web3.eth.defaultAccount = accounts[2];
  const lookup_2_3 = await BlockchainSplitwise.methods.lookup(accounts[2], accounts[3]).call({from:web3.eth.defaultAccount});
  await add_IOU(accounts[3], 30);
  owed = await getTotalOwed(accounts[2]);
  const updated_lookup_2_3 = Number(lookup_2_3) + 30;
  passed += check(`getTotalOwed(2) now ${updated_lookup_2_3}`, owed === updated_lookup_2_3) ? 1 : 0;

  // 3 -> (lookup_3_0 + 40) 0, THERE IS A LOOP
  web3.eth.defaultAccount = accounts[3];
  const lookup_3_0 = await BlockchainSplitwise.methods.lookup(accounts[3], accounts[0]).call({from:web3.eth.defaultAccount});
  console.log('LOOP');
  console.log(`getTotalOwed(3) before LOOP: ${lookup_3_0}`);

  // Prepare for the loop
  const potential_lookup_3_0 = Number(lookup_3_0) + 40;
  let min = Math.min(updated_lookup_0_1, updated_lookup_1_2, updated_lookup_2_3, potential_lookup_3_0);

  await add_IOU(accounts[0], lookup_3_0 + 40);
  console.log('CHECKING RESOLVED LOOP');

  // check that all other balance is updated
  owed = await getTotalOwed(accounts[0]);
  const resolved_lookup_0_1 = updated_lookup_0_1 - min;
  passed += check(`getTotalOwed(0) now ${resolved_lookup_0_1}`, owed === resolved_lookup_0_1) ? 1 : 0;

  owed = await getTotalOwed(accounts[1]);
  const resolved_lookup_1_2 = updated_lookup_1_2 - min;
  passed += check(`getTotalOwed(1) now ${resolved_lookup_1_2}`, owed === resolved_lookup_1_2) ? 1 : 0;

  owed = await getTotalOwed(accounts[2]);
  const resolved_lookup_2_3 = updated_lookup_2_3 - min;
  passed += check(`getTotalOwed(2) now ${resolved_lookup_2_3}`, owed === resolved_lookup_2_3) ? 1 : 0;

  owed = await getTotalOwed(accounts[3]);
  const resolved_lookup_3_0 = potential_lookup_3_0 - min;
  passed += check(`getTotalOwed(3) now ${resolved_lookup_3_0}`, owed === resolved_lookup_3_0) ? 1 : 0;

  console.log(`Passed: ${passed}/${7}`);
}

// testLoop();
