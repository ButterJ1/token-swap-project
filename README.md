# Token Swap - Dynamic Supply & Demand Exchange 🚀

A token swap contract with **dynamic price adjustment** that automatically adjusts exchange ratios based on actual supply and demand, solving the fixed-ratio market problems.

## 📅 Project Evolution

**Initial Version (Already Committed):** Implemented basic 3:1 fixed-ratio token swap functionality with multi-token management and basic security mechanisms.

**Motivation for Improvement:** Discovered that fixed ratios cannot reflect real market supply and demand. Token reserve changes after swaps didn't affect pricing, which doesn't match actual trading markets.

**Current Version:** Upgraded to an **automatic price discovery system** where prices adjust dynamically based on token reserves in the contract, achieving true market-driven trading.

## 🔥 Core Improvements

### From Fixed Ratio to Dynamic Pricing
- ❌ **Old Version**: Always fixed 3:1, regardless of trading activity
- ✅ **New Version**: Adjusts based on supply and demand in real-time - scarcer tokens become more expensive

### Real Improvement Example
**Scenario:** Contract has 20,000 YTK + 60,000 TTA (3:1 starting ratio)

**Old Version Behavior:**
```
User swaps 3,000 TTA → Always gets 1,000 YTK
Ratio stays 3:1 forever, no matter how many swaps
```

**New Version Behavior:**
```
User swaps 3,000 TTA → Gets ~952 YTK (ratio becomes 3.31:1)
YTK becomes scarce, price automatically increases
Next swap requires more TTA to get the same amount of YTK
```

## 🎯 Key Features

### Automatic Price Discovery
- **Mathematical Model**: Uses constant product formula (x × y = k)
- **Real-time Adjustment**: Price updates immediately after each trade
- **Market Reflection**: Price increases when supply is low, decreases when supply is high

### Smart Slippage Protection
- **Preview Function**: Preview exact receive amount before swapping
- **Slippage Control**: Set minimum receive amount to avoid price volatility losses
- **Large Trade Protection**: Automatically limits maximum price impact for large trades

### Liquidity Management
- **Initial Setup**: Admin can set any starting ratio
- **Dynamic Balance**: System encourages reverse trading to balance prices
- **Arbitrage Opportunities**: Price deviations create arbitrage space, naturally returning to balance

## 💱 New Trading Experience

### Smart Pricing System
```javascript
// Preview swap result
const expectedAmount = await tokenSwap.getAmountBOut(tokenA, 1000);
console.log(`1000 TTA → ${expectedAmount} YTK`);

// Set slippage protection (2% tolerance)
const minAmount = expectedAmount * 98 / 100;

// Execute safe swap
await tokenSwap.swapAtoB(tokenA, 1000, minAmount);
```

### Real-time Price Queries
```javascript
// View current reserves and ratio
const poolInfo = await tokenSwap.getPoolInfo(tokenA);
console.log(`TTA Reserve: ${poolInfo.reserveA}`);
console.log(`YTK Reserve: ${poolInfo.reserveB}`);
console.log(`Current Ratio: ${poolInfo.reserveA / poolInfo.reserveB}:1`);
```

## 🛠️ Usage

### Deployment and Initialization
```bash
# Compile new contract
npx hardhat compile

# Deploy to testnet
npx hardhat run scripts/simple-amm-deploy.js --network zircuitGarfield

# Test swap functionality
npx hardhat run scripts/amm-interact.js --network zircuitGarfield
```

### Contract Interface Changes

#### Adding Tokens (Requires Initial Liquidity)
```javascript
// Old Version: Only address needed
await tokenSwap.addTokenA(tokenAddress);

// New Version: Need to provide initial liquidity
await tokenA.approve(swapAddress, amountA);
await tokenB.approve(swapAddress, amountB);  
await tokenSwap.addTokenAWithLiquidity(tokenAddress, amountA, amountB);
```

#### Executing Swaps (Added Slippage Protection)
```javascript
// Old Version: Simple swap
await tokenSwap.swapAtoB(tokenA, amount);

// New Version: With slippage protection
const expectedOut = await tokenSwap.getAmountBOut(tokenA, amount);
const minOut = expectedOut * 95 / 100; // 5% slippage tolerance
await tokenSwap.swapAtoB(tokenA, amount, minOut);
```

## 📊 Pricing Mechanism

### Constant Product Model
```
Formula: x × y = k (constant)
x = TokenA reserve amount
y = TokenB reserve amount  
k = liquidity constant
```

### Price Calculation Logic
```javascript
// A to B calculation
newAmountA = currentAmountA + amountIn;
newAmountB = k / newAmountA;
amountOut = currentAmountB - newAmountB;

// Ratio automatically changes
newRatio = newAmountA / newAmountB;
```

### Real Example
```
Initial: 60,000 TTA × 20,000 YTK = 1,200,000,000 (k)
Ratio: 3.0:1

After swapping 3,000 TTA:
New reserves: 63,000 TTA × 19,048 YTK = 1,200,000,000
New ratio: 3.31:1 (TTA becomes cheaper, YTK becomes more expensive)
```

## 🔒 Security Features

### Multi-layer Protection
- **Reentrancy Guard**: Prevents reentrancy attacks
- **Slippage Protection**: Prevents sandwich attacks  
- **Minimum Liquidity**: Prevents pool from being completely drained
- **Authorization Checks**: Safe token transfers

### Management Functions
- **Emergency Withdrawal**: Admin can withdraw funds in emergencies
- **Liquidity Management**: Can add or adjust pool liquidity
- **Multi-pool Support**: Supports multiple token pairs simultaneously

## 🎮 Interactive Testing

### Local Testing
```bash
# Start local node
npx hardhat node

# Deploy contracts
npx hardhat run scripts/simple-amm-deploy.js --network localhost

# Test swaps
npx hardhat run scripts/amm-interact.js --network localhost
```

### Testnet Deployment
```bash
# Deploy to Zircuit Garfield testnet
npx hardhat run scripts/simple-amm-deploy.js --network zircuitGarfield
```

## 📈 Market Effects

### Natural Balancing Mechanism
- **Price Discovery**: Prices reflect real supply and demand relationships
- **Arbitrage Incentives**: Price deviations create arbitrage opportunities
- **Auto-balancing**: Arbitrage activities pull prices back to reasonable ranges

### Improved Trading Experience
- **Transparent Pricing**: All price changes are predictable
- **Instant Response**: Market changes immediately reflected in prices
- **Fair Trading**: No privileges, everyone faces the same pricing mechanism

## 🚀 Real-world Applications

### DeFi Integration
- **Decentralized Exchange**: Can serve as core swap engine for DEXs
- **Liquidity Mining**: Supports liquidity provider reward mechanisms
- **Arbitrage Strategies**: Provides opportunities for arbitrage bots

### Token Economics
- **Price Stability**: Auto-balancing mechanism reduces severe price volatility
- **Market Depth**: Liquidity pools provide better trading depth
- **Economic Incentives**: Encourages long-term holding and liquidity provision

## 📋 Project Structure

```
token-swap-project/
├── contracts/
│   ├── AMMTokenSwap.sol     # New dynamic pricing swap contract
│   └── TokenB.sol           # YTK token contract
├── scripts/
│   ├── simple-amm-deploy.js # Simplified deployment script  
│   └── amm-interact.js      # Interactive testing script
├── test/
│   └── amm-test.js          # Complete test suite
├── hardhat.config.js
└── README.md
```

## 🔮 Future Plans

### Short-term Goals
- [ ] Integrate price oracles for external market prices
- [ ] Implement fee mechanism and revenue distribution
- [ ] Add liquidity provider LP tokens

### Long-term Vision  
- [ ] Support multi-asset swap pools
- [ ] Implement concentrated liquidity mechanism
- [ ] Integrate cross-chain bridge functionality

---

**From Fixed Ratio to Dynamic Pricing - Making Swaps More Like Real Markets!** 🎉

Now your token swap is no longer simple math calculations, but a true **market-driven price discovery system** where each trade affects the next price, just like real exchanges!