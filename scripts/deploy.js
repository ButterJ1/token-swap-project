const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());
    
    // 部署 TokenB（我們的代幣）
    const TokenB = await ethers.getContractFactory("TokenB");
    const tokenB = await TokenB.deploy(
        "NewToken",             // 代幣名稱
        "NT",                   // 代幣符號
        1000000,                // 初始供應量 (1,000,000)
        deployer.address        // 初始擁有者
    );
    await tokenB.waitForDeployment();
    console.log("TokenB deployed to:", await tokenB.getAddress());
    
    // 部署 TokenSwap 合約
    const TokenSwap = await ethers.getContractFactory("TokenSwap");
    const tokenSwap = await TokenSwap.deploy(
        await tokenB.getAddress(),       // TokenB 地址
        deployer.address                 // 合約擁有者
    );
    await tokenSwap.waitForDeployment();
    console.log("TokenSwap deployed to:", await tokenSwap.getAddress());
    
    // 為 TokenSwap 合約提供一些 TokenB
    const transferAmount = ethers.parseEther("100000");
    await tokenB.transfer(await tokenSwap.getAddress(), transferAmount);
    console.log("Transferred 100,000 TokenB to TokenSwap contract");
    
    // 部署一個測試用的 TokenA
    const TestTokenA = await ethers.getContractFactory("TokenB"); // 使用相同的合約模板
    const tokenA = await TestTokenA.deploy(
        "TestTokenA",
        "TTA",
        2000000,
        deployer.address 
    );
    await tokenA.waitForDeployment();
    console.log("TestTokenA deployed to:", await tokenA.getAddress());
    
    // 將 TokenA 添加到支援清單
    await tokenSwap.addTokenA(await tokenA.getAddress());
    console.log("Added TestTokenA to supported tokens");
    
    // 為 TokenSwap 合約提供一些 TokenA
    await tokenA.transfer(await tokenSwap.getAddress(), ethers.parseEther("300000"));
    console.log("Transferred 300,000 TestTokenA to TokenSwap contract");
    
    console.log("\n=== 部署完成 ===");
    console.log("TokenB (我們的代幣):", await tokenB.getAddress());
    console.log("TokenSwap 合約:", await tokenSwap.getAddress());
    console.log("TestTokenA (測試用):", await tokenA.getAddress());
    console.log("\n=== 交換比例 ===");
    console.log("3 TokenA = 1 TokenB");
    console.log("1 TokenB = 3 TokenA");
    
    // 驗證部署是否成功
    console.log("\n=== 驗證部署 ===");
    const tokenBBalance = await tokenB.balanceOf(await tokenSwap.getAddress());
    const tokenABalance = await tokenA.balanceOf(await tokenSwap.getAddress());
    const swapRatio = await tokenSwap.SWAP_RATIO();
    
    console.log("TokenSwap 合約中的 TokenB 餘額:", ethers.formatEther(tokenBBalance));
    console.log("TokenSwap 合約中的 TokenA 餘額:", ethers.formatEther(tokenABalance));
    console.log("交換比例:", swapRatio.toString());
    console.log("支援的 TokenA 數量:", (await tokenSwap.getSupportedTokenCount()).toString());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });