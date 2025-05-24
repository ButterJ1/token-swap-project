const { ethers } = require("hardhat");

async function main() {
    const TOKEN_B_ADDRESS = "0x0B763a6d2D7ea9359e801393aEAB5274222E968c";
    const TOKEN_SWAP_ADDRESS = "0x1A072EC972e9e9Dd1CB80361133dD4A988a6E5aF";
    const TOKEN_A_ADDRESS = "0x52122ddFc8880C1C70dA44cF23533806C93CeA2a";
    
    const signers = await ethers.getSigners();
    const owner = signers[0]; // 部署者帳戶
    const user = signers.length > 1 ? signers[1] : signers[0]; // 如果只有一個帳戶，就用同一個
    
    console.log("使用帳戶:");
    console.log("Owner:", owner.address);
    console.log("User:", user.address);
    console.log("帳戶數量:", signers.length);
    
    const tokenB = await ethers.getContractAt("TokenB", TOKEN_B_ADDRESS);
    const tokenA = await ethers.getContractAt("TokenB", TOKEN_A_ADDRESS);
    const tokenSwap = await ethers.getContractAt("TokenSwap", TOKEN_SWAP_ADDRESS);
    
    console.log("\n=== 當前狀態 ===");
    
    const userBalanceA = await tokenA.balanceOf(user.address);
    const userBalanceB = await tokenB.balanceOf(user.address);
    const ownerBalanceA = await tokenA.balanceOf(owner.address);
    const ownerBalanceB = await tokenB.balanceOf(owner.address);
    
    console.log(`Owner TokenA 餘額: ${ethers.formatEther(ownerBalanceA)}`);
    console.log(`Owner TokenB 餘額: ${ethers.formatEther(ownerBalanceB)}`);
    console.log(`User TokenA 餘額: ${ethers.formatEther(userBalanceA)}`);
    console.log(`User TokenB 餘額: ${ethers.formatEther(userBalanceB)}`);
    
    const trader = user.address === owner.address ? owner : user;
    
    if (trader.address !== owner.address && userBalanceA == 0n) {
        console.log("\n給用戶轉一些 TokenA...");
        await tokenA.transfer(trader.address, ethers.parseEther("1000"));
        console.log("已轉移 1000 TokenA 給用戶");
        
        const newUserBalanceA = await tokenA.balanceOf(trader.address);
        console.log(`用戶新的 TokenA 餘額: ${ethers.formatEther(newUserBalanceA)}`);
    }
    
    console.log("\n=== 測試 A 換 B (300 A -> 100 B) ===");
    
    const amountA = ethers.parseEther("300");
    const traderBalanceA = await tokenA.balanceOf(trader.address);
    console.log(`交易者當前 TokenA 餘額: ${ethers.formatEther(traderBalanceA)}`);
    
    if (traderBalanceA >= amountA) {
        console.log("授權 TokenSwap 使用 TokenA...");
        await tokenA.connect(trader).approve(TOKEN_SWAP_ADDRESS, amountA);
        console.log("授權完成");
        
        console.log("執行交換...");
        const tx = await tokenSwap.connect(trader).swapAtoB(TOKEN_A_ADDRESS, amountA);
        await tx.wait();
        console.log("交換交易完成，TX Hash:", tx.hash);
        
        const newBalanceA = await tokenA.balanceOf(trader.address);
        const newBalanceB = await tokenB.balanceOf(trader.address);
        
        console.log(`交換後 TokenA 餘額: ${ethers.formatEther(newBalanceA)}`);
        console.log(`交換後 TokenB 餘額: ${ethers.formatEther(newBalanceB)}`);
        
        console.log("\n=== 測試 B 換 A (50 B -> 150 A) ===");
        
        const amountB = ethers.parseEther("50");
        
        const currentBalanceB = await tokenB.balanceOf(trader.address);
        if (currentBalanceB >= amountB) {
            console.log("授權 TokenSwap 使用 TokenB...");
            await tokenB.connect(trader).approve(TOKEN_SWAP_ADDRESS, amountB);
            console.log("授權完成");
    
            console.log("執行交換...");
            const tx2 = await tokenSwap.connect(trader).swapBtoA(TOKEN_A_ADDRESS, amountB);
            await tx2.wait();
            console.log("交換交易完成，TX Hash:", tx2.hash);
            
            const finalBalanceA = await tokenA.balanceOf(trader.address);
            const finalBalanceB = await tokenB.balanceOf(trader.address);
            
            console.log(`最終 TokenA 餘額: ${ethers.formatEther(finalBalanceA)}`);
            console.log(`最終 TokenB 餘額: ${ethers.formatEther(finalBalanceB)}`);
        } else {
            console.log("交易者 TokenB 不足，跳過 B 換 A 測試");
            console.log(`需要: ${ethers.formatEther(amountB)}, 擁有: ${ethers.formatEther(currentBalanceB)}`);
        }
    } else {
        console.log("交易者 TokenA 不足，無法進行交換");
        console.log(`需要: ${ethers.formatEther(amountA)}, 擁有: ${ethers.formatEther(traderBalanceA)}`);
    }
    
    console.log("\n=== 合約狀態檢查 ===");
    const contractBalanceA = await tokenA.balanceOf(TOKEN_SWAP_ADDRESS);
    const contractBalanceB = await tokenB.balanceOf(TOKEN_SWAP_ADDRESS);
    console.log(`合約中 TokenA 餘額: ${ethers.formatEther(contractBalanceA)}`);
    console.log(`合約中 TokenB 餘額: ${ethers.formatEther(contractBalanceB)}`);
    
    console.log("\n=== 交換完成! ===");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });