const { ethers } = require("hardhat");

async function main() {
    const TOKEN_B_ADDRESS = "0xc0F016Ee17076cED54490a7E9D09174f3c253D68";
    const SWAP_ADDRESS = "0xD2110a3aE628ab04efC65996D91F41223ba7A8bC";
    
    const signers = await ethers.getSigners();
    const owner = signers[0];
    const user = signers.length > 1 ? signers[1] : signers[0];
    
    console.log("=== TokenSwap Interaction Test ===");
    console.log("Owner:", owner.address);
    console.log("User:", user.address);
    
    const tokenB = await ethers.getContractAt("TokenB", TOKEN_B_ADDRESS);
    const tokenSwap = await ethers.getContractAt("TokenSwap", SWAP_ADDRESS);
    
    // Get all supported tokens
    const supportedTokens = await tokenSwap.getAllSupportedTokens();
    console.log("\n=== Pool Overview ===");
    console.log("Active pools count:", supportedTokens.length);
    
    const tokenContracts = [];
    const tokenInfo = [];
    
    for (let i = 0; i < supportedTokens.length; i++) {
        const tokenAddress = supportedTokens[i];
        const tokenContract = await ethers.getContractAt("TokenB", tokenAddress);
        const symbol = await tokenContract.symbol();
        const name = await tokenContract.name();
        
        // Get pool information
        const poolInfo = await tokenSwap.getPoolInfo(tokenAddress);
        const ratio = Number(ethers.formatEther(poolInfo.reserveA)) / Number(ethers.formatEther(poolInfo.reserveB));
        
        tokenContracts.push(tokenContract);
        tokenInfo.push({
            address: tokenAddress,
            symbol: symbol,
            name: name,
            reserveA: poolInfo.reserveA,
            reserveB: poolInfo.reserveB,
            k: poolInfo.k,
            ratio: ratio
        });
        
        console.log(`\n💧 ${symbol} (${name}) Pool:`);
        console.log(`   Address: ${tokenAddress}`);
        console.log(`   ${symbol} Reserve: ${ethers.formatEther(poolInfo.reserveA)}`);
        console.log(`   YTK Reserve: ${ethers.formatEther(poolInfo.reserveB)}`);
        console.log(`   Current Ratio: ${ratio.toFixed(4)}:1`);
        console.log(`   Liquidity (k): ${poolInfo.k.toString()}`);
    }
    
    if (tokenInfo.length === 0) {
        console.log("❌ No pools found");
        return;
    }
    
    // Display user balances
    console.log("\n=== User Wallet Balances ===");
    const userBalanceB = await tokenB.balanceOf(user.address);
    console.log(`YTK: ${ethers.formatEther(userBalanceB)}`);
    
    for (let i = 0; i < tokenContracts.length; i++) {
        const balance = await tokenContracts[i].balanceOf(user.address);
        console.log(`${tokenInfo[i].symbol}: ${ethers.formatEther(balance)}`);
    }
    
    // Provide test tokens to user (if needed)
    if (user.address !== owner.address) {
        console.log("\n=== Providing Test Tokens to User ===");
        
        if (userBalanceB < ethers.parseEther("100")) {
            await tokenB.connect(owner).transfer(user.address, ethers.parseEther("1000"));
            console.log("✅ Transferred 1000 YTK to user");
        }
        
        for (let i = 0; i < tokenContracts.length; i++) {
            const balance = await tokenContracts[i].balanceOf(user.address);
            if (balance < ethers.parseEther("1000")) {
                await tokenContracts[i].connect(owner).transfer(user.address, ethers.parseEther("5000"));
                console.log(`✅ Transferred 5000 ${tokenInfo[i].symbol} to user`);
            }
        }
    }
    
    // Swap preview functionality
    console.log("\n=== Swap Preview ===");
    const testAmounts = [
        ethers.parseEther("100"),
        ethers.parseEther("500"), 
        ethers.parseEther("1000"),
        ethers.parseEther("5000")
    ];
    
    for (let i = 0; i < Math.min(tokenInfo.length, 2); i++) { // Only test first two tokens
        const token = tokenInfo[i];
        console.log(`\n${token.symbol} → YTK Swap Preview:`);
        
        for (const amount of testAmounts) {
            try {
                const amountOut = await tokenSwap.getAmountBOut(token.address, amount);
                const effectiveRate = Number(ethers.formatEther(amount)) / Number(ethers.formatEther(amountOut));
                console.log(`  ${ethers.formatEther(amount)} ${token.symbol} → ${ethers.formatEther(amountOut)} YTK (Rate: ${effectiveRate.toFixed(4)}:1)`);
            } catch (error) {
                console.log(`  ❌ ${ethers.formatEther(amount)} ${token.symbol}: Insufficient liquidity`);
            }
        }
    }
    
    // Execute actual swap test
    console.log("\n=== Execute Swap Test ===");
    
    if (tokenInfo.length > 0) {
        const testToken = tokenContracts[0];
        const testTokenInfo = tokenInfo[0];
        const swapAmount = ethers.parseEther("1000"); // Test with 1000 tokens
        
        console.log(`\nTesting ${testTokenInfo.symbol} → YTK swap`);
        
        // Check user balance
        const userBalance = await testToken.balanceOf(user.address);
        if (userBalance < swapAmount) {
            console.log(`❌ Insufficient ${testTokenInfo.symbol} balance for user`);
            console.log(`Required: ${ethers.formatEther(swapAmount)}, Available: ${ethers.formatEther(userBalance)}`);
            return;
        }
        
        // Preview swap
        const expectedOut = await tokenSwap.getAmountBOut(testTokenInfo.address, swapAmount);
        console.log(`Expected output: ${ethers.formatEther(expectedOut)} YTK`);
        
        // Set slippage protection (2% slippage tolerance)
        const slippageTolerance = 200; // 2% in basis points
        const minAmountOut = (expectedOut * BigInt(10000 - slippageTolerance)) / BigInt(10000);
        console.log(`Minimum output (2% slippage): ${ethers.formatEther(minAmountOut)} YTK`);
        
        // Record pre-swap state
        const balanceBefore = await tokenB.balanceOf(user.address);
        const poolInfoBefore = await tokenSwap.getPoolInfo(testTokenInfo.address);
        
        try {
            // Approve
            console.log("Approving token swap...");
            await testToken.connect(user).approve(SWAP_ADDRESS, swapAmount);
            
            // Execute swap
            console.log("Executing swap...");
            const tx = await tokenSwap.connect(user).swapAtoB(
                testTokenInfo.address, 
                swapAmount, 
                minAmountOut
            );
            await tx.wait();
            console.log("✅ Swap completed! TX Hash:", tx.hash);
            
            // Check post-swap state
            const balanceAfter = await tokenB.balanceOf(user.address);
            const poolInfoAfter = await tokenSwap.getPoolInfo(testTokenInfo.address);
            const actualOut = balanceAfter - balanceBefore;
            
            console.log(`\nSwap Results:`);
            console.log(`  Actually received: ${ethers.formatEther(actualOut)} YTK`);
            console.log(`  Expected to receive: ${ethers.formatEther(expectedOut)} YTK`);
            console.log(`  Slippage: ${((Number(ethers.formatEther(expectedOut)) - Number(ethers.formatEther(actualOut))) / Number(ethers.formatEther(expectedOut)) * 100).toFixed(2)}%`);
            
            // Show pool changes
            const newRatio = Number(ethers.formatEther(poolInfoAfter.reserveA)) / Number(ethers.formatEther(poolInfoAfter.reserveB));
            console.log(`\nPool State Changes:`);
            console.log(`  ${testTokenInfo.symbol} Reserve: ${ethers.formatEther(poolInfoBefore.reserveA)} → ${ethers.formatEther(poolInfoAfter.reserveA)}`);
            console.log(`  YTK Reserve: ${ethers.formatEther(poolInfoBefore.reserveB)} → ${ethers.formatEther(poolInfoAfter.reserveB)}`);
            console.log(`  Ratio Change: ${testTokenInfo.ratio.toFixed(4)}:1 → ${newRatio.toFixed(4)}:1`);
            
        } catch (error) {
            console.log("❌ Swap failed:", error.message);
            if (error.message.includes("Slippage too high")) {
                console.log("💡 Tip: Try increasing slippage tolerance or reducing swap amount");
            }
        }
    }
    
    // Test reverse swap
    console.log("\n=== Test Reverse Swap (YTK → TokenA) ===");
    
    if (tokenInfo.length > 1) {
        const testToken = tokenContracts[1];
        const testTokenInfo = tokenInfo[1];
        const swapAmountB = ethers.parseEther("500"); // 500 YTK
        
        console.log(`Testing YTK → ${testTokenInfo.symbol} swap`);
        
        const userBalanceB = await tokenB.balanceOf(user.address);
        if (userBalanceB >= swapAmountB) {
            const expectedOutA = await tokenSwap.getAmountAOut(testTokenInfo.address, swapAmountB);
            const minAmountOutA = (expectedOutA * BigInt(9800)) / BigInt(10000); // 2% slippage
            
            console.log(`Expected to receive: ${ethers.formatEther(expectedOutA)} ${testTokenInfo.symbol}`);
            
            try {
                await tokenB.connect(user).approve(SWAP_ADDRESS, swapAmountB);
                const tx = await tokenSwap.connect(user).swapBtoA(
                    testTokenInfo.address,
                    swapAmountB,
                    minAmountOutA
                );
                await tx.wait();
                console.log("✅ Reverse swap completed!");
                
            } catch (error) {
                console.log("❌ Reverse swap failed:", error.message);
            }
        } else {
            console.log("❌ Insufficient YTK balance for reverse swap");
        }
    }
    
    // Final state report
    console.log("\n=== Final State ===");
    
    for (let i = 0; i < tokenInfo.length; i++) {
        const token = tokenInfo[i];
        const finalPoolInfo = await tokenSwap.getPoolInfo(token.address);
        const finalRatio = Number(ethers.formatEther(finalPoolInfo.reserveA)) / Number(ethers.formatEther(finalPoolInfo.reserveB));
        
        console.log(`\n${token.symbol} Pool Final State:`);
        console.log(`  ${token.symbol} Reserve: ${ethers.formatEther(finalPoolInfo.reserveA)}`);
        console.log(`  YTK Reserve: ${ethers.formatEther(finalPoolInfo.reserveB)}`);
        console.log(`  Current Ratio: ${finalRatio.toFixed(4)}:1`);
        console.log(`  Liquidity Constant: ${finalPoolInfo.k.toString()}`);
    }
    
}

main()
    .then(() => {
        console.log("\n🎉 System Test Complete!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Test failed:", error);
        process.exit(1);
    });