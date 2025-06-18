const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());
    
    // Deploy TokenB (our token)
    const TokenB = await ethers.getContractFactory("TokenB");
    const tokenB = await TokenB.deploy(
        "YieldToken",
        "YTK",
        1000000,
        deployer.address
    );
    await tokenB.waitForDeployment();
    console.log("TokenB deployed to:", await tokenB.getAddress());
    
    // Deploy TokenSwap contract
    const TokenSwap = await ethers.getContractFactory("TokenSwap");
    const tokenSwap = await TokenSwap.deploy(
        await tokenB.getAddress(),
        deployer.address
    );
    await tokenSwap.waitForDeployment();
    console.log("TokenSwap deployed to:", await tokenSwap.getAddress());
    
    // Deploy a test TokenA
    const TestTokenA = await ethers.getContractFactory("TokenB");
    const tokenA = await TestTokenA.deploy(
        "TestTokenA",
        "TTA",
        2000000,
        deployer.address 
    );
    await tokenA.waitForDeployment();
    console.log("TestTokenA deployed to:", await tokenA.getAddress());
    
    // Set up liquidity pool
    const amountA = ethers.parseEther("60000");  // 60,000 TTA
    const amountB = ethers.parseEther("20000");  // 20,000 YTK
    
    // Approve contract to use tokens
    await tokenA.approve(await tokenSwap.getAddress(), amountA);
    await tokenB.approve(await tokenSwap.getAddress(), amountB);
    
    // Create liquidity pool
    await tokenSwap.addTokenAWithLiquidity(await tokenA.getAddress(), amountA, amountB);
    console.log("Added TestTokenA to supported tokens with initial liquidity");
    
    console.log("\n=== Deployment Complete ===");
    console.log("TokenB (our token):", await tokenB.getAddress());
    console.log("TokenSwap contract:", await tokenSwap.getAddress());
    console.log("TestTokenA (for testing):", await tokenA.getAddress());
    
    // Verify deployment success
    console.log("\n=== Deployment Verification ===");
    const poolInfo = await tokenSwap.getPoolInfo(await tokenA.getAddress());
    console.log("TTA reserves in TokenSwap contract:", ethers.formatEther(poolInfo.reserveA));
    console.log("YTK reserves in TokenSwap contract:", ethers.formatEther(poolInfo.reserveB));
    console.log("Liquidity constant k:", poolInfo.k.toString());
    console.log("Current ratio:", Number(ethers.formatEther(poolInfo.reserveA)) / Number(ethers.formatEther(poolInfo.reserveB)));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });