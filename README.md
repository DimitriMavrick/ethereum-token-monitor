# ethereum-token-monitor

A monitoring system that tracks ERC-20 token transfers for specified Ethereum addresses.

## Overview

This tool monitors a list of Ethereum addresses (up to 10,000) and alerts when any of these addresses send or receive a specific ERC-20 token. The system uses both event listeners and block polling for reliable detection.

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/ethereum-token-monitor.git
cd ethereum-token-monitor

# Install dependencies
npm install
Configuration

Add addresses to monitor in the addresses.txt file (one address per line)
Configure token address and other settings in the monitoring scripts

Running the System
Step 1: Start the notification server
bash# Start the notification server
node notification-server.js
Step 2: Start the monitoring script
bash# Run the main monitoring script with Hardhat
npx hardhat run monitor-test.js --network hardhat
Step 3: Check for notifications

Open your browser and go to http://localhost:3000
Click on "View Received Notifications" to see detected transfers

Testing
The system includes a test script that simulates token transfers between monitored addresses:
bash# Run the test script
npx hardhat run monitor-test.js --network hardhat
Networks
You can configure different networks in the Hardhat configuration file. For testing purposes, you can use:
bash# Run a local Hardhat node
npx hardhat node

# Run against the local node
npx hardhat run monitor-test.js --network localhost
Troubleshooting

Make sure both the notification server and monitoring script are running simultaneously
Check that your addresses.txt file contains valid Ethereum addresses
Verify the token contract address in the monitoring script is correct
For mainnet monitoring, ensure you have configured an RPC provider in your Hardhat config


This README provides:
1. Clear installation instructions
2. Step-by-step guide for running both components of the system
3. Explanation of how to check if it's working
4. Troubleshooting tips for beginners

