const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Configuration
const TOKEN_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; // USDT
const TOKEN_DECIMALS = 6;
const ADDRESSES_FILE = "./addresses.txt"; // File containing addresses to monitor

async function main() {
  console.log("=== ETHEREUM TOKEN TRANSFER MONITORING ===\n");
  
  // 1. LOAD ADDRESSES TO MONITOR
  // ============================
  
  // Load addresses from file
  const monitoredAddresses = loadAddressesFromFile(ADDRESSES_FILE);
  console.log(`Loaded ${monitoredAddresses.size} addresses to monitor`);
  console.log(`Token address: ${TOKEN_ADDRESS} (${TOKEN_DECIMALS} decimals)`);
  
  // Check initial block number
  const startBlock = await ethers.provider.getBlockNumber();
  console.log(`Current block on network: ${startBlock}`);
  
  // 2. SETUP TOKEN MONITORING - MULTIPLE APPROACHES
  // ==============================================
  
  // Create contract instance
  const tokenContract = await ethers.getContractAt(
    ["event Transfer(address indexed from, address indexed to, uint256 value)"],
    TOKEN_ADDRESS
  );
  
  // Approach 1: Event listener for real-time monitoring
  setupEventListener(tokenContract, monitoredAddresses);
  
  // Approach 2: Block polling for reliability
  const pollingInterval = setupBlockPolling(tokenContract, monitoredAddresses, startBlock);
  
  console.log("\n=== MONITORING ACTIVE ===");
  console.log("The script will continue monitoring. Press Ctrl+C to exit.");
  
  // Keep the script running to continue monitoring
  await new Promise(() => {});
}

// Function to load addresses from file
function loadAddressesFromFile(filePath) {
  try {
    const addresses = new Set();
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log(`File ${filePath} not found, please create it with one Ethereum address per line`);
      process.exit(1);
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
        } else {
          console.log("\n⚠️ TRANSFER DETECTED but couldn't get transaction details");
          console.log(`From: ${from}${monitoredAddresses.has(fromAddress) ? " (MONITORED)" : ""}`);
          console.log(`To: ${to}${monitoredAddresses.has(toAddress) ? " (MONITORED)" : ""}`);
          console.log(`Amount: ${ethers.formatUnits(value, TOKEN_DECIMALS)} USDT`);
        }
      } catch (error) {
        console.error("Error processing event:", error.message);
        
        // Fallback logging with available information
        console.log("\n⚠️ TRANSFER DETECTED (Error in processing details)");
        console.log(`From: ${from}${monitoredAddresses.has(fromAddress) ? " (MONITORED)" : ""}`);
        console.log(`To: ${to}${monitoredAddresses.has(toAddress) ? " (MONITORED)" : ""}`);
        console.log(`Amount: ${ethers.formatUnits(value, TOKEN_DECIMALS)} USDT`);
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
          }
        }
        
        // Update last checked block
        lastCheckedBlock = currentBlock;
      }
    } catch (error) {
      console.error("Error in block polling:", error.message);
    }
  }, 2000);
  
  return interval;
}

// Handle script termination
process.on('SIGINT', () => {
  console.log("\nStopping monitoring...");
  process.exit(0);
});

main().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});