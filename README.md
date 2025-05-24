# Token Swap 3:1 交換合約

一個支援 3:1 固定比例的代幣交換合約，允許任何 ERC20 代幣與你的主代幣進行交換。

## 🚀 功能特點

- **固定交換比例**: 3個 A 代幣 ↔ 1個 B 代幣
- **雙向交換**: 支援 A→B 和 B→A 交換
- **多代幣支援**: 可以動態添加/移除支援的 A 代幣
- **安全機制**: 防重入攻擊保護
- **管理功能**: Owner 可以緊急提取代幣
- **可升級**: 靈活的代幣支援管理

## 📁 項目結構

```
token-swap-project/
├── contracts/
│   ├── TokenSwap.sol      # 主要交換合約
│   └── TokenB.sol         # B 代幣合約 (你的代幣)
├── scripts/
│   ├── deploy.js          # 部署腳本
│   └── interact.js        # 交互測試腳本
├── test/
│   └── TokenSwap.test.js  # 測試文件
├── hardhat.config.js      # Hardhat 配置
├── package.json
└── README.md
```

## 🛠️ 安裝和設置

### 1. 克隆項目並安裝依賴

```bash
git clone <your-repo-url>
cd token-swap-project
npm install
```

### 2. 環境配置

創建 `.env` 文件：

```bash
# 你的私鑰 (不要包含 0x 前綴)
PRIVATE_KEY=your_private_key_here

# 可選：其他網絡配置
SEPOLIA_URL=https://sepolia.infura.io/v3/your_infura_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### 3. 編譯合約

```bash
npx hardhat compile
```

## 🧪 測試

運行完整測試套件：

```bash
npx hardhat test
```

測試包含：
- 基本功能測試 (交換比例、代幣管理)
- A→B 交換測試
- B→A 交換測試
- 管理功能測試

## 🚀 部署

### 本地部署

1. 啟動本地 Hardhat 節點：
```bash
npx hardhat node
```

2. 部署合約（新終端）：
```bash
npx hardhat run scripts/deploy.js --network localhost
```

### 測試網部署

部署到 Zircuit Garfield 測試網：

```bash
npx hardhat run scripts/deploy.js --network zircuitGarfield
```

## 💱 使用交換功能

部署後，更新 `scripts/interact.js` 中的合約地址並運行：

```bash
npx hardhat run scripts/interact.js --network <network-name>
```

## 📊 合約接口

### TokenSwap 主要函數

#### 用戶函數
- `swapAtoB(address tokenA, uint256 amountA)` - 用 A 代幣換 B 代幣
- `swapBtoA(address tokenA, uint256 amountB)` - 用 B 代幣換 A 代幣
- `calculateAtoB(uint256 amountA)` - 計算 A 換 B 的數量
- `calculateBtoA(uint256 amountB)` - 計算 B 換 A 的數量

#### 管理員函數 (僅 Owner)
- `addTokenA(address tokenA)` - 添加支援的 A 代幣
- `removeTokenA(address tokenA)` - 移除支援的 A 代幣
- `emergencyWithdraw(address token, uint256 amount)` - 緊急提取代幣

#### 查詢函數
- `supportedTokensA(address)` - 檢查代幣是否支援
- `getAllSupportedTokens()` - 獲取所有支援的代幣
- `getTokenBalance(address token)` - 查看合約代幣餘額

## 💡 交換示例

### A 代幣換 B 代幣 (3:1)

```javascript
// 授權合約使用你的 TokenA
await tokenA.approve(tokenSwapAddress, ethers.parseEther("300"));

// 執行交換：300 TokenA -> 100 TokenB
await tokenSwap.swapAtoB(tokenAAddress, ethers.parseEther("300"));
```

### B 代幣換 A 代幣 (1:3)

```javascript
// 授權合約使用你的 TokenB
await tokenB.approve(tokenSwapAddress, ethers.parseEther("100"));

// 執行交換：100 TokenB -> 300 TokenA
await tokenSwap.swapBtoA(tokenAAddress, ethers.parseEther("100"));
```

## ⚠️ 重要說明

### 交換規則
- **A→B**: 數量必須能被 3 整除
- **B→A**: 無特殊限制
- 合約必須有足夠的流動性

### 安全考慮
- 使用前務必測試
- 確保合約已審計
- 注意滑點和 MEV 攻擊
- 設置合理的交易限額

## 📝 部署記錄

最新部署地址 (Zircuit Garfield 測試網):

```
TokenB (YTK):    0x0B763a6d2D7ea9359e801393aEAB5274222E968c
TokenSwap:       0x1A072EC972e9e9Dd1CB80361133dD4A988a6E5aF
TestTokenA (TTA): 0x52122ddFc8880C1C70dA44cF23533806C93CeA2a
```

## 🔧 常見問題

### Q: 為什麼我的交換失敗了？
A: 檢查以下幾點：
- 是否授權了合約使用你的代幣
- 合約是否有足夠的流動性
- A→B 交換時數量是否能被 3 整除

### Q: 如何添加新的 A 代幣？
A: 作為合約 Owner，調用 `addTokenA(address)` 函數

### Q: 可以修改交換比例嗎？
A: 當前版本的比例是固定的 3:1，如需修改需要部署新合約

## 🛡️ 安全功能

- **ReentrancyGuard**: 防止重入攻擊
- **Ownable**: 管理員權限控制
- **SafeERC20**: 安全的代幣轉移
- **餘額檢查**: 確保充足流動性

## 📋 待辦事項

- [ ] 添加交換手續費機制
- [ ] 實現動態匯率調整
- [ ] 添加流動性提供者獎勵
- [ ] 整合價格預言機
- [ ] 添加治理代幣機制

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

---

**⚡ 快速開始：**

```bash
npm install
npx hardhat compile
npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost
```