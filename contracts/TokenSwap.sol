// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TokenSwap is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // B 代幣（你們的代幣）
    IERC20 public immutable tokenB;
    
    // 交換比例：3 A : 1 B
    uint256 public constant SWAP_RATIO = 3;
    
    // 支援的 A 代幣清單
    mapping(address => bool) public supportedTokensA;
    
    // 代幣 A 的清單（方便查詢）
    address[] public tokenAList;
    
    // 事件
    event SwapAtoB(address indexed tokenA, address indexed user, uint256 amountA, uint256 amountB);
    event SwapBtoA(address indexed tokenA, address indexed user, uint256 amountB, uint256 amountA);
    event TokenAAdded(address indexed tokenA);
    event TokenARemoved(address indexed tokenA);
    
    constructor(address _tokenB, address initialOwner) Ownable(initialOwner) {
        require(_tokenB != address(0), "Invalid token B address");
        tokenB = IERC20(_tokenB);
    }
    
    /**
     * @dev 添加支援的 A 代幣
     */
    function addTokenA(address _tokenA) external onlyOwner {
        require(_tokenA != address(0), "Invalid token address");
        require(_tokenA != address(tokenB), "Cannot add token B as token A");
        require(!supportedTokensA[_tokenA], "Token already supported");
        
        supportedTokensA[_tokenA] = true;
        tokenAList.push(_tokenA);
        
        emit TokenAAdded(_tokenA);
    }
    
    /**
     * @dev 移除支援的 A 代幣
     */
    function removeTokenA(address _tokenA) external onlyOwner {
        require(supportedTokensA[_tokenA], "Token not supported");
        
        supportedTokensA[_tokenA] = false;
        
        // 從陣列中移除
        for (uint256 i = 0; i < tokenAList.length; i++) {
            if (tokenAList[i] == _tokenA) {
                tokenAList[i] = tokenAList[tokenAList.length - 1];
                tokenAList.pop();
                break;
            }
        }
        
        emit TokenARemoved(_tokenA);
    }
    
    /**
     * @dev 用 A 代幣換 B 代幣 (3 A -> 1 B)
     */
    function swapAtoB(address _tokenA, uint256 _amountA) external nonReentrant {
        require(supportedTokensA[_tokenA], "Token A not supported");
        require(_amountA > 0, "Amount must be greater than 0");
        require(_amountA % SWAP_RATIO == 0, "Amount must be divisible by 3");
        
        uint256 amountB = _amountA / SWAP_RATIO;
        
        // 檢查合約是否有足夠的 B 代幣
        require(tokenB.balanceOf(address(this)) >= amountB, "Insufficient token B in contract");
        
        // 轉入 A 代幣
        IERC20(_tokenA).safeTransferFrom(msg.sender, address(this), _amountA);
        
        // 轉出 B 代幣
        tokenB.safeTransfer(msg.sender, amountB);
        
        emit SwapAtoB(_tokenA, msg.sender, _amountA, amountB);
    }
    
    /**
     * @dev 用 B 代幣換 A 代幣 (1 B -> 3 A)
     */
    function swapBtoA(address _tokenA, uint256 _amountB) external nonReentrant {
        require(supportedTokensA[_tokenA], "Token A not supported");
        require(_amountB > 0, "Amount must be greater than 0");
        
        uint256 amountA = _amountB * SWAP_RATIO;
        
        // 檢查合約是否有足夠的 A 代幣
        require(IERC20(_tokenA).balanceOf(address(this)) >= amountA, "Insufficient token A in contract");
        
        // 轉入 B 代幣
        tokenB.safeTransferFrom(msg.sender, address(this), _amountB);
        
        // 轉出 A 代幣
        IERC20(_tokenA).safeTransfer(msg.sender, amountA);
        
        emit SwapBtoA(_tokenA, msg.sender, _amountB, amountA);
    }
    
    /**
     * @dev 計算 A 代幣可以換到多少 B 代幣
     */
    function calculateAtoB(uint256 _amountA) external pure returns (uint256) {
        return _amountA / SWAP_RATIO;
    }
    
    /**
     * @dev 計算 B 代幣可以換到多少 A 代幣
     */
    function calculateBtoA(uint256 _amountB) external pure returns (uint256) {
        return _amountB * SWAP_RATIO;
    }
    
    /**
     * @dev 獲取支援的 A 代幣數量
     */
    function getSupportedTokenCount() external view returns (uint256) {
        return tokenAList.length;
    }
    
    /**
     * @dev 獲取所有支援的 A 代幣地址
     */
    function getAllSupportedTokens() external view returns (address[] memory) {
        address[] memory supportedTokens = new address[](tokenAList.length);
        uint256 count = 0;
        
        for (uint256 i = 0; i < tokenAList.length; i++) {
            if (supportedTokensA[tokenAList[i]]) {
                supportedTokens[count] = tokenAList[i];
                count++;
            }
        }
        
        // 調整陣列大小
        assembly {
            mstore(supportedTokens, count)
        }
        
        return supportedTokens;
    }
    
    /**
     * @dev 緊急提取代幣（僅限 owner）
     */
    function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).safeTransfer(owner(), _amount);
    }
    
    /**
     * @dev 檢查合約中代幣餘額
     */
    function getTokenBalance(address _token) external view returns (uint256) {
        return IERC20(_token).balanceOf(address(this));
    }
}
