const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenSwap", function () {
    let tokenB, tokenA, tokenSwap;
    let owner, user1, user2;

    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();

        const TokenB = await ethers.getContractFactory("TokenB");
        tokenB = await TokenB.deploy("NewToken", "NT", 1000000, owner.address);
        await tokenB.waitForDeployment();
        
        const TokenA = await ethers.getContractFactory("TokenB");
        tokenA = await TokenA.deploy("TestTokenA", "TTA", 2000000, owner.address);
        await tokenA.waitForDeployment();
        
        const TokenSwap = await ethers.getContractFactory("TokenSwap");
        tokenSwap = await TokenSwap.deploy(await tokenB.getAddress(), owner.address);
        await tokenSwap.waitForDeployment();
        
        // 添加 TokenA 到支援清單
        await tokenSwap.addTokenA(await tokenA.getAddress());
        
        await tokenB.transfer(await tokenSwap.getAddress(), ethers.parseEther("100000"));
        await tokenA.transfer(await tokenSwap.getAddress(), ethers.parseEther("300000"));
        await tokenA.transfer(user1.address, ethers.parseEther("1000"));
        await tokenB.transfer(user1.address, ethers.parseEther("100"));
    });

    describe("基本功能測試", function () {
        it("應該正確設置交換比例", async function () {
            expect(await tokenSwap.SWAP_RATIO()).to.equal(3);
        });

        it("應該正確添加支援的 TokenA", async function () {
            expect(await tokenSwap.supportedTokensA(await tokenA.getAddress())).to.be.true;
        });

        it("應該正確計算交換比例", async function () {
            // 300 TokenA -> 100 TokenB
            expect(await tokenSwap.calculateAtoB(ethers.parseEther("300")))
                .to.equal(ethers.parseEther("100"));
            
            // 100 TokenB -> 300 TokenA
            expect(await tokenSwap.calculateBtoA(ethers.parseEther("100")))
                .to.equal(ethers.parseEther("300"));
        });
    });

    describe("A 換 B 測試", function () {
        it("應該成功用 TokenA 換 TokenB", async function () {
            const amountA = ethers.parseEther("300");
            const expectedB = ethers.parseEther("100");
            
            // 用戶授權 TokenSwap 使用他的 TokenA
            await tokenA.connect(user1).approve(await tokenSwap.getAddress(), amountA);
            
            // 記錄交換前的餘額
            const userBalanceABefore = await tokenA.balanceOf(user1.address);
            const userBalanceBBefore = await tokenB.balanceOf(user1.address);
            
            await tokenSwap.connect(user1).swapAtoB(await tokenA.getAddress(), amountA);
            
            const userBalanceAAfter = await tokenA.balanceOf(user1.address);
            const userBalanceBAfter = await tokenB.balanceOf(user1.address);
            
            expect(userBalanceAAfter).to.equal(userBalanceABefore - amountA);
            expect(userBalanceBAfter).to.equal(userBalanceBBefore + expectedB);
        });

        it("應該拒絕不能被 3 整除的金額", async function () {
            const amountA = ethers.parseEther("100"); // 100 不能被 3 整除
            
            await tokenA.connect(user1).approve(await tokenSwap.getAddress(), amountA);
            
            await expect(
                tokenSwap.connect(user1).swapAtoB(await tokenA.getAddress(), amountA)
            ).to.be.revertedWith("Amount must be divisible by 3");
        });
    });

    describe("B 換 A 測試", function () {
        it("應該成功用 TokenB 換 TokenA", async function () {
            const amountB = ethers.parseEther("50"); // 50 TokenB
            const expectedA = ethers.parseEther("150"); // 150 TokenA
   
            await tokenB.connect(user1).approve(await tokenSwap.getAddress(), amountB);
            
            const userBalanceABefore = await tokenA.balanceOf(user1.address);
            const userBalanceBBefore = await tokenB.balanceOf(user1.address);

            await tokenSwap.connect(user1).swapBtoA(await tokenA.getAddress(), amountB);
            
            const userBalanceAAfter = await tokenA.balanceOf(user1.address);
            const userBalanceBAfter = await tokenB.balanceOf(user1.address);
            
            expect(userBalanceAAfter).to.equal(userBalanceABefore + expectedA);
            expect(userBalanceBAfter).to.equal(userBalanceBBefore - amountB);
        });
    });

    describe("管理功能測試", function () {
        it("應該允許 owner 緊急提取代幣", async function () {
            const withdrawAmount = ethers.parseEther("1000");
            const ownerBalanceBefore = await tokenA.balanceOf(owner.address);
            
            await tokenSwap.emergencyWithdraw(await tokenA.getAddress(), withdrawAmount);
            
            const ownerBalanceAfter = await tokenA.balanceOf(owner.address);
            expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + withdrawAmount);
        });

        it("應該正確顯示合約代幣餘額", async function () {
            const contractBalance = await tokenSwap.getTokenBalance(await tokenB.getAddress());
            expect(contractBalance).to.equal(ethers.parseEther("100000"));
        });
    });
});