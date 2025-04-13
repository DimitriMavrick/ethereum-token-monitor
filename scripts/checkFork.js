// scripts/checkFork.js
async function main() {
    const provider = ethers.provider;
    const blockNumber = await provider.getBlockNumber();
    console.log("Forked block number:", blockNumber);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });