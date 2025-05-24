require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
   solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  networks:{
    zircuitGarfield: {
      url: `https://garfield-testnet.zircuit.com/`,
      chainId: 48898,
      accounts: [process.env.PRIVATE_KEY],
      gasPrice: 1000000000,
    }
  },

  etherscan: {
    enabled: false,
  },
  sourcify: {
    enabled: true,
    apiUrl: 'https://sourcify.dev/server',
    browserUrl: 'https://repo.sourcify.dev',
  }
};