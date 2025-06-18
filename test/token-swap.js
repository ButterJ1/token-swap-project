const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenSwap", function () {
    let tokenB, tokenA, tokenSwap;
    let owner, user1;

    beforeEach(async function () {
        [owner, user1] = await ethers.getSigners();

        // Deploy TokenB
        const TokenB = await ethers.getContractFactory("TokenB");
        tokenB = await TokenB.deploy("YieldToken", "YTK", 1000000, owner.address);
        await tokenB.waitForDeployment();
        
        // Deploy TokenA
        const TokenA = await ethers.getContractFactory("TokenB");
        tokenA = await TokenA.deploy("TestTokenA", "TTA", 2000000, owner.address);
        await tokenA.waitForDeployment();
        
        // Deploy TokenSwap
        const TokenSwap = await ethers.getContractFactory("TokenSwap");
        tokenSwap = await TokenSwap.deploy(await tokenB.getAddress(), owner.address);
        await tokenSwap.waitForDeployment();
    });

    describe("Deployment and Initialization", function () {
        it("should correctly set TokenB", async function () {
            expect(await tokenSwap.tokenB()).to.equal(await tokenB.getAddress());
        });

        it("should correctly add liquidity pool", async function () {
            const amountA = ethers.parseEther("60000");
            const amountB = ethers.parseEther("20000");
            
            await tokenA.approve(await tokenSwap.getAddress(), amountA);
            await tokenB.approve(await tokenSwap.getAddress(), amountB);
            
            await tokenSwap.addTokenAWithLiquidity(await tokenA.getAddress(), amountA, amountB);
            
            expect(await tokenSwap.supportedTokensA(await tokenA.getAddress())).to.be.true;
            
            const poolInfo = await tokenSwap.getPoolInfo(await tokenA.getAddress());
            expect(poolInfo.reserveA).to.equal(amountA);
            expect(poolInfo.k).to.equal(amountA * amountB);
        });
    });

    describe("Swap Functionality", function () {
        beforeEach(async function () {
            // Set up liquidity pool
            const amountA = ethers.parseEther("60000");
            const amountB = ethers.parseEther("20000");
            
            await tokenA.approve(await tokenSwap.getAddress(), amountA);
            await tokenB.approve(await tokenSwap.getAddress(), amountB);
            await tokenSwap.addTokenAWithLiquidity(await tokenA.getAddress(), amountA, amountB);
            
            // Give user some tokens
            await tokenA.transfer(user1.address, ethers.parseEther("10000"));
            await tokenB.transfer(user1.address, ethers.parseEther("1000"));
        });

        it("should correctly calculate A to B swap amount", async function () {
            const amountAIn = ethers.parseEther("3000");
            const expectedAmountB = await tokenSwap.getAmountBOut(await tokenA.getAddress(), amountAIn);
            
            // Based on formula: amountB = reserveB - (k / (reserveA + amountAIn))
            // k = 60000 * 20000, reserveA = 60000, reserveB = 20000
            // amountB = 20000 - (1200000000 / 63000) ≈ 952.38
            expect(Number(ethers.formatEther(expectedAmountB))).to.be.closeTo(952.38, 1);
        });

        it("should successfully execute A to B swap", async function () {
            const amountAIn = ethers.parseEther("3000");
            const expectedAmountB = await tokenSwap.getAmountBOut(await tokenA.getAddress(), amountAIn);
            const minAmountB = expectedAmountB * 98n / 100n; // 2% slippage
            
            await tokenA.connect(user1).approve(await tokenSwap.getAddress(), amountAIn);
            
            const balanceBBefore = await tokenB.balanceOf(user1.address);
            
            await tokenSwap.connect(user1).swapAtoB(
                await tokenA.getAddress(), 
                amountAIn, 
                minAmountB
            );
            
            const balanceBAfter = await tokenB.balanceOf(user1.address);
            const actualAmountB = balanceBAfter - balanceBBefore;
            
            expect(actualAmountB).to.be.gte(minAmountB);
            expect(actualAmountB).to.be.lte(expectedAmountB);
        });

        it("should reject swaps exceeding slippage tolerance", async function () {
            const amountAIn = ethers.parseEther("3000");
            const expectedAmountB = await tokenSwap.getAmountBOut(await tokenA.getAddress(), amountAIn);
            const unrealisticMinAmount = expectedAmountB * 110n / 100n; // Requires 110%, impossible
            
            await tokenA.connect(user1).approve(await tokenSwap.getAddress(), amountAIn);
            
            await expect(
                tokenSwap.connect(user1).swapAtoB(
                    await tokenA.getAddress(), 
                    amountAIn, 
                    unrealisticMinAmount
                )
            ).to.be.revertedWith("Slippage too high");
        });

        it("should correctly update pool reserves", async function () {
            const amountAIn = ethers.parseEther("3000");
            const expectedAmountB = await tokenSwap.getAmountBOut(await tokenA.getAddress(), amountAIn);
            const minAmountB = expectedAmountB * 98n / 100n;
            
            const poolInfoBefore = await tokenSwap.getPoolInfo(await tokenA.getAddress());
            
            await tokenA.connect(user1).approve(await tokenSwap.getAddress(), amountAIn);
            await tokenSwap.connect(user1).swapAtoB(
                await tokenA.getAddress(), 
                amountAIn, 
                minAmountB
            );
            
            const poolInfoAfter = await tokenSwap.getPoolInfo(await tokenA.getAddress());
            
            // Check reserve changes
            expect(poolInfoAfter.reserveA).to.equal(poolInfoBefore.reserveA + amountAIn);
            expect(poolInfoAfter.reserveB).to.be.lt(poolInfoBefore.reserveB);
            
            // Check k value remains constant (within margin of error)
            expect(poolInfoAfter.k).to.equal(poolInfoBefore.k);
        });
    });

    describe("Management Functions", function () {
        it("should allow owner to emergency withdraw", async function () {
            const amountA = ethers.parseEther("60000");
            const amountB = ethers.parseEther("20000");
            
            await tokenA.approve(await tokenSwap.getAddress(), amountA);
            await tokenB.approve(await tokenSwap.getAddress(), amountB);
            await tokenSwap.addTokenAWithLiquidity(await tokenA.getAddress(), amountA, amountB);
            
            const withdrawAmount = ethers.parseEther("1000");
            const ownerBalanceBefore = await tokenA.balanceOf(owner.address);
            
            await tokenSwap.emergencyWithdraw(await tokenA.getAddress(), withdrawAmount);
            
            const ownerBalanceAfter = await tokenA.balanceOf(owner.address);
            expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + withdrawAmount);
        });
    });
});