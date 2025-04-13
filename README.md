# ethereum-token-monitor
# ethereum-token-monitor

A monitoring system that tracks ERC-20 token transfers for specified Ethereum addresses.

## Overview

This tool monitors a list of Ethereum addresses (up to 10,00) and alerts when any of these addresses send or receive a specific ERC-20 token. The system uses both event listeners and block polling for reliable detection.

# Install dependencies
npm install


npx hardhat node

# Run the main monitoring script
npx hardhat run ./KoinCx/monitoring.js --network <network>

# Run the testing version with simulated transfers
npx hardhat run ./KoinCx/monitoring-testing.js --network <network>