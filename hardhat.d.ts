import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Ethers } from '@nomicfoundation/hardhat-ethers/types';

declare module 'hardhat/types' {
  interface HardhatRuntimeEnvironment {
    ethers: Ethers;
  }
}