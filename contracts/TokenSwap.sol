// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TokenSwap is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable tokenB;
    
    // List of supported Token A
    mapping(address => bool) public supportedTokensA;
    
    // Liquidity pool constant k for each TokenA (for x * y = k formula)
    mapping(address => uint256) public poolConstants;
    
    // List of Token A addresses
    address[] public tokenAList;
    
    // Minimum liquidity protection (prevents pool from being completely drained)
    uint256 public constant MINIMUM_LIQUIDITY = 1000;
    
    // Slippage protection (maximum 5% per transaction)
    uint256 public constant MAX_SLIPPAGE = 500; // 5% in basis points
    
    // Events
    event SwapAtoB(address indexed tokenA, address indexed user, uint256 amountAIn, uint256 amountBOut, uint256 newRatio);
    event SwapBtoA(address indexed tokenA, address indexed user, uint256 amountBIn, uint256 amountAOut, uint256 newRatio);
    event LiquidityAdded(address indexed tokenA, uint256 amountA, uint256 amountB, uint256 k);
    event TokenAAdded(address indexed tokenA);
    event TokenARemoved(address indexed tokenA);
    
    constructor(address _tokenB, address initialOwner) Ownable(initialOwner) {
        require(_tokenB != address(0), "Invalid token B address");
        tokenB = IERC20(_tokenB);
    }
    
    // Add supported Token A and establish initial liquidity pool
    function addTokenAWithLiquidity(
        address _tokenA, 
        uint256 _amountA, 
        uint256 _amountB
    ) external onlyOwner {
        require(_tokenA != address(0), "Invalid token address");
        require(_tokenA != address(tokenB), "Cannot add token B as token A");
        require(!supportedTokensA[_tokenA], "Token already supported");
        require(_amountA > MINIMUM_LIQUIDITY && _amountB > MINIMUM_LIQUIDITY, "Amounts too small");
        
        supportedTokensA[_tokenA] = true;
        tokenAList.push(_tokenA);
        
        // Calculate constant k = x * y
        poolConstants[_tokenA] = _amountA * _amountB;
        
        // Transfer initial liquidity
        IERC20(_tokenA).safeTransferFrom(msg.sender, address(this), _amountA);
        tokenB.safeTransferFrom(msg.sender, address(this), _amountB);
        
        emit TokenAAdded(_tokenA);
        emit LiquidityAdded(_tokenA, _amountA, _amountB, poolConstants[_tokenA]);
    }
    
    // Remove supported Token A (requires liquidity to be drained first)
    function removeTokenA(address _tokenA) external onlyOwner {
        require(supportedTokensA[_tokenA], "Token not supported");
        
        // Check if liquidity has been cleared
        uint256 reserveA = IERC20(_tokenA).balanceOf(address(this));
        uint256 reserveB = getTokenBReserveForPool(_tokenA);
        require(reserveA <= MINIMUM_LIQUIDITY && reserveB <= MINIMUM_LIQUIDITY, "Pool still has liquidity");
        
        supportedTokensA[_tokenA] = false;
        delete poolConstants[_tokenA];
        
        // Remove from array
        for (uint256 i = 0; i < tokenAList.length; i++) {
            if (tokenAList[i] == _tokenA) {
                tokenAList[i] = tokenAList[tokenAList.length - 1];
                tokenAList.pop();
                break;
            }
        }
        
        emit TokenARemoved(_tokenA);
    }
    
    
    // Swap Token A for Token B (formula: x * y = k)
    function swapAtoB(address _tokenA, uint256 _amountAIn, uint256 _minAmountBOut) 
        external nonReentrant {
        require(supportedTokensA[_tokenA], "Token A not supported");
        require(_amountAIn > 0, "Amount must be greater than 0");
        
        uint256 reserveABefore = IERC20(_tokenA).balanceOf(address(this));
        uint256 reserveBBefore = getTokenBReserveForPool(_tokenA);
        uint256 k = poolConstants[_tokenA];
        
        require(reserveABefore > 0 && reserveBBefore > 0, "Pool not initialized");
        
        // Calculate how much Token B the user can get
        // Formula: amountBOut = reserveB - (k / (reserveA + amountAIn))
        uint256 reserveAAfter = reserveABefore + _amountAIn;
        uint256 reserveBAfter = k / reserveAAfter;
        uint256 amountBOut = reserveBBefore - reserveBAfter;
        
        require(amountBOut >= _minAmountBOut, "Slippage too high");
        require(reserveBAfter >= MINIMUM_LIQUIDITY, "Insufficient liquidity");
        
        // Execute transfers
        IERC20(_tokenA).safeTransferFrom(msg.sender, address(this), _amountAIn);
        tokenB.safeTransfer(msg.sender, amountBOut);
        
        // Calculate new ratio (for events)
        uint256 newRatio = (reserveAAfter * 10000) / reserveBAfter;
        
        emit SwapAtoB(_tokenA, msg.sender, _amountAIn, amountBOut, newRatio);
    }
    
    // Swap Token B for Token A (formula: x * y = k)
    function swapBtoA(address _tokenA, uint256 _amountBIn, uint256 _minAmountAOut) 
        external nonReentrant {
        require(supportedTokensA[_tokenA], "Token A not supported");
        require(_amountBIn > 0, "Amount must be greater than 0");
        
        uint256 reserveABefore = IERC20(_tokenA).balanceOf(address(this));
        uint256 reserveBBefore = getTokenBReserveForPool(_tokenA);
        uint256 k = poolConstants[_tokenA];
        
        require(reserveABefore > 0 && reserveBBefore > 0, "Pool not initialized");
        
        // Calculate how much Token A the user can get
        // Formula: amountAOut = reserveA - (k / (reserveB + amountBIn))
        uint256 reserveBAfter = reserveBBefore + _amountBIn;
        uint256 reserveAAfter = k / reserveBAfter;
        uint256 amountAOut = reserveABefore - reserveAAfter;
        
        require(amountAOut >= _minAmountAOut, "Slippage too high");
        require(reserveAAfter >= MINIMUM_LIQUIDITY, "Insufficient liquidity");
        
        // Execute transfers
        tokenB.safeTransferFrom(msg.sender, address(this), _amountBIn);
        IERC20(_tokenA).safeTransfer(msg.sender, amountAOut);
        
        // Calculate new ratio
        uint256 newRatio = (reserveAAfter * 10000) / reserveBAfter;
        
        emit SwapBtoA(_tokenA, msg.sender, _amountBIn, amountAOut, newRatio);
    }
    
    // Calculate how much B can be obtained by swapping A (preview function)
    function getAmountBOut(address _tokenA, uint256 _amountAIn) 
        external view returns (uint256) {
        require(supportedTokensA[_tokenA], "Token A not supported");
        
        uint256 reserveA = IERC20(_tokenA).balanceOf(address(this));
        uint256 reserveB = getTokenBReserveForPool(_tokenA);
        uint256 k = poolConstants[_tokenA];
        
        if (reserveA == 0 || reserveB == 0 || k == 0) return 0;
        
        uint256 reserveAAfter = reserveA + _amountAIn;
        uint256 reserveBAfter = k / reserveAAfter;
        
        return reserveB - reserveBAfter;
    }
    
    // Calculate how much A can be obtained by swapping B (preview function)
    function getAmountAOut(address _tokenA, uint256 _amountBIn) 
        external view returns (uint256) {
        require(supportedTokensA[_tokenA], "Token A not supported");
        
        uint256 reserveA = IERC20(_tokenA).balanceOf(address(this));
        uint256 reserveB = getTokenBReserveForPool(_tokenA);
        uint256 k = poolConstants[_tokenA];
        
        if (reserveA == 0 || reserveB == 0 || k == 0) return 0;
        
        uint256 reserveBAfter = reserveB + _amountBIn;
        uint256 reserveAAfter = k / reserveBAfter;
        
        return reserveA - reserveAAfter;
    }
    
    // Get current exchange ratio (A:B)
    function getCurrentRatio(address _tokenA) external view returns (uint256, uint256) {
        require(supportedTokensA[_tokenA], "Token A not supported");
        
        uint256 reserveA = IERC20(_tokenA).balanceOf(address(this));
        uint256 reserveB = getTokenBReserveForPool(_tokenA);
        
        if (reserveA == 0 || reserveB == 0) return (0, 0);
        
        // Return (numerator, denominator) representing the ratio
        return (reserveA, reserveB);
    }
    
    // Get pool information
    function getPoolInfo(address _tokenA) external view returns (
        uint256 reserveA,
        uint256 reserveB, 
        uint256 k,
        uint256 ratio
    ) {
        require(supportedTokensA[_tokenA], "Token A not supported");
        
        reserveA = IERC20(_tokenA).balanceOf(address(this));
        reserveB = getTokenBReserveForPool(_tokenA);
        k = poolConstants[_tokenA];
        ratio = reserveA > 0 && reserveB > 0 ? (reserveA * 10000) / reserveB : 0;
    }
    
    // Calculate Token B reserves for a specific pool
    // Assumes all Token B is evenly distributed among pools
    function getTokenBReserveForPool(address _tokenA) public view returns (uint256) {
        require(supportedTokensA[_tokenA], "Token A not supported");
        
        uint256 totalReserveB = tokenB.balanceOf(address(this));
        uint256 activePoolsCount = getActivePoolsCount();
        
        if (activePoolsCount == 0) return 0;
        
        // Simplified: even distribution (in practice, might need more complex allocation mechanism)
        return totalReserveB / activePoolsCount;
    }
    
    // Get number of active pools
    function getActivePoolsCount() public view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < tokenAList.length; i++) {
            if (supportedTokensA[tokenAList[i]] && poolConstants[tokenAList[i]] > 0) {
                count++;
            }
        }
        return count;
    }
    
    // Add liquidity to existing pool
    function addLiquidity(address _tokenA, uint256 _amountA, uint256 _amountB) 
        external onlyOwner {
        require(supportedTokensA[_tokenA], "Token A not supported");
        require(_amountA > 0 && _amountB > 0, "Amounts must be positive");
        
        // Transfer tokens
        IERC20(_tokenA).safeTransferFrom(msg.sender, address(this), _amountA);
        tokenB.safeTransferFrom(msg.sender, address(this), _amountB);
        
        // Update constant k
        uint256 newReserveA = IERC20(_tokenA).balanceOf(address(this));
        uint256 newReserveB = getTokenBReserveForPool(_tokenA);
        poolConstants[_tokenA] = newReserveA * newReserveB;
        
        emit LiquidityAdded(_tokenA, _amountA, _amountB, poolConstants[_tokenA]);
    }
    
    // Emergency withdraw tokens (owner only)
    function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).safeTransfer(owner(), _amount);
    }
    
    // Get all supported tokens
    function getAllSupportedTokens() external view returns (address[] memory) {
        address[] memory supportedTokens = new address[](tokenAList.length);
        uint256 count = 0;
        
        for (uint256 i = 0; i < tokenAList.length; i++) {
            if (supportedTokensA[tokenAList[i]]) {
                supportedTokens[count] = tokenAList[i];
                count++;
            }
        }
        
        // Resize array
        assembly {
            mstore(supportedTokens, count)
        }
        
        return supportedTokens;
    }
}