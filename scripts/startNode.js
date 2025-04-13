async function main() {
  const { ethers } = require("hardhat");
  const wallets = await ethers.getSigners();
  for (const wallet of wallets) {
    console.log(`Address: ${wallet.address}`);
    console.log(`Private Key: ${wallet.privateKey}`);
    console.log("---");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });