const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Configuration
const TOKEN_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; // USDT
const TOKEN_DECIMALS = 6;
const ADDRESSES_FILE = "./addresses.txt"; // File containing addresses to monitor
const TEST_ADDRESSES = [
  "0xf977814e90da44bfa03b6295a0616a897441acec", // Sender in our test
  "0x5a52e96bacdabb82fd05763e25335261b270efcb", // Recipient in our test
  "0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503",
  "0x5754284f345afc66a98fbb0a0afe71e0f007b949",
  "0x835678a611b28684005a5e2233695fb6cbbb0007"
];

async function testMonitoring() {
  console.log("=== ETHEREUM TOKEN TRANSFER MONITORING TEST ===\n");
  
  // 1. Ensure test addresses are in the addresses file
  ensureTestAddressesInFile(ADDRESSES_FILE, TEST_ADDRESSES);
  
  // 2. Setup monitoring
  const { tokenContract, monitoredAddresses, startBlock } = await setupMonitoring();
  
  // Wait a moment for the monitoring to be set up
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 3. Perform test transfer
  console.log("\n=== EXECUTING TEST TRANSFER ===");
  
  // For testing, we'll use the first and second addresses from our test set
  const testSender = TEST_ADDRESSES[0].toLowerCase();
  const testRecipient = TEST_ADDRESSES[1].toLowerCase();
  
  // Verify these addresses are in our monitored set
  if (!monitoredAddresses.has(testSender) || !monitoredAddresses.has(testRecipient)) {
    console.error("Test addresses are not in the monitored set!");
    process.exit(1);
  }
  
  // Execute the test transfer
  await executeTestTransfer(testSender, testRecipient, TOKEN_ADDRESS, TOKEN_DECIMALS);
  
  // Wait to ensure events are processed
  console.log("\nWaiting for event processing...");
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // 4. Cleanup and completion
  console.log("\n=== TEST COMPLETED SUCCESSFULLY ===");
  console.log("You should have seen the transfer detection above if the monitoring is working correctly.");
  console.log("The script will now exit.");
  
  process.exit(0);
}

// Function to ensure test addresses are in the file
function ensureTestAddressesInFile(filePath, testAddresses) {
  try {
    // Create a set of lowercase test addresses
    const testAddressSet = new Set(testAddresses.map(addr => addr.toLowerCase()));
    let existingAddresses = new Set();
    let fileContent = '';
    
    // Check if file exists and read existing addresses
    if (fs.existsSync(filePath)) {
      fileContent = fs.readFileSync(filePath, 'utf8');
      const lines = fileContent.split('\n');
      
      lines.forEach(line => {
        const address = line.trim().toLowerCase();
        if (address && address.startsWith('0x') && address.length === 42) {
          existingAddresses.add(address);
        }
      });
    } else {
      // Create directory if it doesn't exist
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    
    // Add any missing test addresses
    let addressesAdded = 0;
    testAddresses.forEach(addr => {
      const lowercaseAddr = addr.toLowerCase();
      if (!existingAddresses.has(lowercaseAddr)) {
        fileContent += lowercaseAddr + '\n';
        existingAddresses.add(lowercaseAddr);
        addressesAdded++;
      }
    });
    
    // Write the file if addresses were added
    if (addressesAdded > 0) {
      fs.writeFileSync(filePath, fileContent, 'utf8');
      console.log(`Added ${addressesAdded} test addresses to ${filePath}`);
    } else {
      console.log(`All test addresses already exist in ${filePath}`);
    }
    
    console.log(`Total addresses in file: ${existingAddresses.size}`);
  } catch (error) {
    console.error(`Error ensuring test addresses: ${error.message}`);
  }
}

// Setup monitoring functionality
async function setupMonitoring() {
  // Load addresses from file
  const monitoredAddresses = loadAddressesFromFile(ADDRESSES_FILE);
  console.log(`Loaded ${monitoredAddresses.size} addresses to monitor`);
  console.log(`Token address: ${TOKEN_ADDRESS} (${TOKEN_DECIMALS} decimals)`);
  
  // Check initial block number
  const startBlock = await ethers.provider.getBlockNumber();
  console.log(`Current block on forked network: ${startBlock}`);
  
  // Create contract instance
  const tokenContract = await ethers.getContractAt(
    ["event Transfer(address indexed from, address indexed to, uint256 value)"],
    TOKEN_ADDRESS
  );
  
  // Approach 1: Event listener for real-time monitoring
  setupEventListener(tokenContract, monitoredAddresses);
  
  // Approach 2: Block polling for reliability
  setupBlockPolling(tokenContract, monitoredAddresses, startBlock);
  
  return { tokenContract, monitoredAddresses, startBlock };
}

// Function to load addresses from file
function loadAddressesFromFile(filePath) {
  try {
    const addresses = new Set();
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log(`File ${filePath} not found!`);
      return addresses;
    }
    
    // Read addresses from existing file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.split('\n');
    
    lines.forEach((line) => {
      const address = line.trim().toLowerCase();
      if (address && address.startsWith('0x') && address.length === 42) {
        addresses.add(address);
      }
    });
    
    return addresses;
  } catch (error) {
    console.error(`Error loading addresses: ${error.message}`);
    return new Set();
  }
}

// Function to set up event listener for real-time monitoring
function setupEventListener(tokenContract, monitoredAddresses) {
  console.log("\nSetting up Transfer event listener...");
  
  tokenContract.on("Transfer", async (from, to, value, eventObj) => {
    const fromAddress = from.toLowerCase();
    const toAddress = to.toLowerCase();
    
    // Check if sender or receiver is in our monitored list
    if (monitoredAddresses.has(fromAddress) || monitoredAddresses.has(toAddress)) {
      try {
        // In ethers.js event listeners, transaction data is accessed differently
        // We can use the event's log data
        const log = eventObj.log || eventObj;
        const txHash = log.transactionHash;
        const blockNumber = log.blockNumber;
        
        // Only proceed if we have the transaction hash
        if (txHash) {
          const block = await ethers.provider.getBlock(blockNumber);
          
          console.log("\n🚨 MONITORED ADDRESS TRANSFER DETECTED! (Event Listener) 🚨");
          console.log(`Block: ${blockNumber}`);
          console.log(`Transaction: ${txHash}`);
          console.log(`From: ${from}${monitoredAddresses.has(fromAddress) ? " (MONITORED)" : ""}`);
          console.log(`To: ${to}${monitoredAddresses.has(toAddress) ? " (MONITORED)" : ""}`);
          console.log(`Amount: ${ethers.formatUnits(value, TOKEN_DECIMALS)} USDT`);
          console.log(`Timestamp: ${block ? new Date(block.timestamp * 1000).toISOString() : 'Unknown'}`);
          console.log("---------------------------------------------------");
          
          // Send to notification endpoint
          sendApiNotification({
            transactionHash: txHash,
            blockNumber: blockNumber,
            from: from,
            fromIsMonitored: monitoredAddresses.has(fromAddress),
            to: to,
            toIsMonitored: monitoredAddresses.has(toAddress),
            amount: ethers.formatUnits(value, TOKEN_DECIMALS),
            timestamp: block ? new Date(block.timestamp * 1000).toISOString() : 'Unknown',
            detectionMethod: "Event Listener"
          });
        }
      } catch (error) {
        console.error("Error processing event:", error.message);
      }
    }
  });
}

// Function to set up block polling for reliability
function setupBlockPolling(tokenContract, monitoredAddresses, startBlock) {
  console.log("Setting up block polling for reliability...");
  
  let lastCheckedBlock = startBlock;
  
  // Set polling interval (every 2 seconds)
  const interval = setInterval(async () => {
    try {
      const currentBlock = await ethers.provider.getBlockNumber();
      
      // If new blocks are available
      if (currentBlock > lastCheckedBlock) {
        console.log(`Polling: Checking blocks ${lastCheckedBlock + 1} to ${currentBlock}...`);
        
        // Query for Transfer events in the new blocks
        const events = await tokenContract.queryFilter(
          tokenContract.filters.Transfer(),
          lastCheckedBlock + 1,
          currentBlock
        );
        
        // Process events
        for (const event of events) {
          const from = event.args.from.toLowerCase();
          const to = event.args.to.toLowerCase();
          
          // Check if sender or receiver is in our monitored list
          if (monitoredAddresses.has(from) || monitoredAddresses.has(to)) {
            const block = await ethers.provider.getBlock(event.blockNumber);
            
            console.log("\n🚨 MONITORED ADDRESS TRANSFER DETECTED! (Block Polling) 🚨");
            console.log(`Block: ${event.blockNumber}`);
            console.log(`Transaction: ${event.transactionHash}`);
            console.log(`From: ${event.args.from}${monitoredAddresses.has(from) ? " (MONITORED)" : ""}`);
            console.log(`To: ${event.args.to}${monitoredAddresses.has(to) ? " (MONITORED)" : ""}`);
            console.log(`Amount: ${ethers.formatUnits(event.args.value, TOKEN_DECIMALS)} USDT`);
            console.log(`Timestamp: ${new Date(block.timestamp * 1000).toISOString()}`);
            console.log("---------------------------------------------------");
            
            // Send to notification endpoint
            sendApiNotification({
              transactionHash: event.transactionHash,
              blockNumber: event.blockNumber,
              from: event.args.from,
              fromIsMonitored: monitoredAddresses.has(from),
              to: event.args.to,
              toIsMonitored: monitoredAddresses.has(to),
              amount: ethers.formatUnits(event.args.value, TOKEN_DECIMALS),
              timestamp: new Date(block.timestamp * 1000).toISOString(),
              detectionMethod: "Block Polling"
            });
          }
        }
        
        // Update last checked block - THIS LINE IS CRUCIAL
        lastCheckedBlock = currentBlock;
      }
    } catch (error) {
      console.error("Error in block polling:", error.message);
    }
  }, 2000);
  
  return interval;
}

// Function to execute test transfer
async function executeTestTransfer(fromAddress, toAddress, tokenAddress, decimals) {
  console.log(`Impersonating account: ${fromAddress}`);
  
  // Impersonate the account
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [fromAddress],
  });
  
  // Get the signer for the impersonated account
  const impersonatedSigner = await ethers.getSigner(fromAddress);
  
  // Get the token contract
  const tokenWithSigner = await ethers.getContractAt(
    [
      "function balanceOf(address) view returns (uint256)",
      "function transfer(address, uint256) returns (bool)"
    ],
    tokenAddress,
    impersonatedSigner
  );
  
  // Check balance before transfer
  const balance = await tokenWithSigner.balanceOf(fromAddress);
  console.log(`Sender's Balance: ${ethers.formatUnits(balance, decimals)} USDT`);
  
  const recipientInitialBalance = await tokenWithSigner.balanceOf(toAddress);
  console.log(`Recipient's Initial Balance: ${ethers.formatUnits(recipientInitialBalance, decimals)} USDT`);
  
  // Transfer amount (1 USDT)
  const transferAmount = ethers.parseUnits("1.0", decimals);
  
  // Make the transfer
  console.log("Sending transaction...");
  const tx = await tokenWithSigner.transfer(toAddress, transferAmount);
  console.log(`Transaction hash: ${tx.hash}`);
  
  // Wait for transaction to be mined
  console.log("Waiting for transaction confirmation...");
  const receipt = await tx.wait();
  
  // Check balances after transfer
  const newBalance = await tokenWithSigner.balanceOf(fromAddress);
  const recipientBalance = await tokenWithSigner.balanceOf(toAddress);
  console.log(`\nSender's new balance: ${ethers.formatUnits(newBalance, decimals)} USDT`);
  console.log(`Recipient's new balance: ${ethers.formatUnits(recipientBalance, decimals)} USDT`);
  
  // Stop impersonating
  await hre.network.provider.request({
    method: "hardhat_stopImpersonatingAccount",
    params: [fromAddress],
  });
  
  return receipt;
}

// Function to send API notifications
async function sendApiNotification(data) {
  const NOTIFICATION_ENDPOINT = process.env.NOTIFICATION_ENDPOINT || 'http://localhost:3000/api/notifications';
  
  try {
    console.log(`Sending notification to: ${NOTIFICATION_ENDPOINT}`);
    console.log(`Notification data: ${JSON.stringify(data, null, 2)}`);
    
   
    // Uncomment this code:
    
    const response = await fetch(NOTIFICATION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      console.error(`API notification failed: ${response.status} - ${response.statusText}`);
    } else {
      console.log('Notification sent successfully');
    }
    
    
    // For older Node.js versions, you might want to use axios or https module instead
  } catch (error) {
    console.error("Error sending API notification:", error.message);
  }
}

// Start the test
testMonitoring().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});