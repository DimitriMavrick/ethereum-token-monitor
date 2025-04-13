import hre from 'hardhat';

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Using account:", deployer.address);

  // Deploy MockERC20
  const MockERC20 = await hre.ethers.getContractFactory("MockERC20", deployer);
  const mockERC20 = await MockERC20.deploy(1000000); // 1 million tokens
  await mockERC20.waitForDeployment();
  const tokenAddress = mockERC20.target;
  console.log("MockERC20 deployed to:", tokenAddress);

  // Deploy MultiSend
  const MultiSend = await hre.ethers.getContractFactory("MultiSend", deployer);
  const multiSend = await MultiSend.deploy();
  await multiSend.waitForDeployment();
  const spender = multiSend.target;
  console.log("MultiSend deployed to:", spender);

  const tokenContract = await hre.ethers.getContractAt("MockERC20", tokenAddress);

  try {
    const decimals = await tokenContract.decimals();
    console.log('Decimals:', decimals.toString());
    const allowance = await tokenContract.allowance(deployer.address, spender);
    console.log('Allowance:', allowance.toString());
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});