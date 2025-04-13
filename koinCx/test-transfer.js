const { ethers } = require("hardhat");

async function main() {
  // First check the current block number
  const currentBlock = await ethers.provider.getBlockNumber();
  console.log(`Current block on forked network: ${currentBlock}`);
  
  // Address to impersonate (one from your monitoring list)
  const addressToImpersonate = "0xf977814e90da44bfa03b6295a0616a897441acec";
  
  // USDT token address
  const usdtAddress = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
  const tokenDecimals = 6; // USDT has 6 decimals
  
  // Recipient address (one from your list)
  const recipientAddress = "0x5a52e96bacdabb82fd05763e25335261b270efcb";
  
  console.log(`\nImpersonating account: ${addressToImpersonate}`);
  
  // Impersonate the account
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [addressToImpersonate],
  });
  
  // Get the signer for the impersonated account
  const impersonatedSigner = await ethers.getSigner(addressToImpersonate);
  
  // Get the USDT contract
  const usdt = await ethers.getContractAt(
    [
      "function balanceOf(address) view returns (uint256)",
      "function transfer(address, uint256) returns (bool)"
    ],
    usdtAddress,
    impersonatedSigner
  );
  
  // Check balance before transfer
  const balance = await usdt.balanceOf(addressToImpersonate);
  console.log(`USDT Balance: ${ethers.formatUnits(balance, tokenDecimals)} USDT`);
  
  // Transfer amount (1 USDT with 6 decimals)
  const transferAmount = ethers.parseUnits("1.0", tokenDecimals);
  
//   // Make sure we don't try to transfer more than the account has
//   const amountToTransfer = balance.lt(transferAmount) ? balance : transferAmount;
  
//   console.log(`\nTransferring ${ethers.formatUnits(amountToTransfer, tokenDecimals)} USDT from ${addressToImpersonate} to ${recipientAddress}...`);
  
  // Make the transfer
  console.log("Sending transaction...");
  const tx = await usdt.transfer(recipientAddress, transferAmount);
  console.log(`Transaction hash: ${tx.hash}`);
  
  // Wait for transaction to be mined
  console.log("Waiting for transaction confirmation...");
  const receipt = await tx.wait();
  
  // Check the new block number
  const newBlock = await ethers.provider.getBlockNumber();
  
  console.log(`\nTransfer completed!`);
  console.log(`Transaction mined in block ${receipt.blockNumber}`);
  console.log(`Network is now at block ${newBlock}`);
  
  // Check balances after transfer
  const newBalance = await usdt.balanceOf(addressToImpersonate);
  const recipientBalance = await usdt.balanceOf(recipientAddress);
  console.log(`\nSender's new balance: ${ethers.formatUnits(newBalance, tokenDecimals)} USDT`);
  console.log(`Recipient's new balance: ${ethers.formatUnits(recipientBalance, tokenDecimals)} USDT`);
  
  // Stop impersonating
  await hre.network.provider.request({
    method: "hardhat_stopImpersonatingAccount",
    params: [addressToImpersonate],
  });
  
  console.log("\nTest completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });