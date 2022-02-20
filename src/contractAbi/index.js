import { ethers } from "ethers";
import { base64 } from "ethers/lib/utils";

import { AVATAR_CONTRACTS, BOARD_CONTRACTS } from "../config";
import { avatar, board } from './contractAbi';
import { getTokens } from './queries';

export async function getAvatarContract(provider) {
  const network = await provider.getNetwork();
  const chainId = `0x${network.chainId.toString(16)}`;
  return new ethers.Contract(AVATAR_CONTRACTS[chainId], avatar.abi, provider);
}

export async function getBoardContract(provider) {
  const network = await provider.getNetwork();
  const chainId = `0x${network.chainId.toString(16)}`;
  return new ethers.Contract(BOARD_CONTRACTS[chainId], board.abi, provider);
}

export async function getOwnedAvatars(provider, address) {
  const avatars = await getTokens(provider, address);
  console.log(`getOwnedAvatars(${address}) =>`, avatars);
  return avatars;
}