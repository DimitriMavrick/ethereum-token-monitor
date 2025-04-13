async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const MultiSend = await ethers.getContractFactory("MultiSend");
  const multiSend = await MultiSend.deploy();
  await multiSend.waitForDeployment();
  console.log("MultiSend deployed to:", multiSend.target);

  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const mockERC20 = await MockERC20.deploy(1000000); // 1 million tokens
  await mockERC20.waitForDeployment();
  console.log("MockERC20 deployed to:", mockERC20.target);

  // Verify deployment
  const decimals = await mockERC20.decimals();
  console.log("MockERC20 decimals:", decimals.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });