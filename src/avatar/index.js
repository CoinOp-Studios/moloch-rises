import { ethers } from "ethers";
import { parseEther } from "ethers/lib/utils";

import { AVATAR_CONTRACTS } from "../config";
import { avatar } from './avatar';
import { getTokens } from './queries';

export async function getAvatarContract(provider) {
  const network = await provider.getNetwork();
  const chainId = `0x${network.chainId.toString(16)}`;
  return new ethers.Contract(AVATAR_CONTRACTS[chainId], avatar.abi, provider);
}

export async function getOwnedAvatars(provider, address) {
  const avatars = await getTokens(provider, address);
  console.log(`getOwnedAvatars(${address}) =>`, avatars);
  return avatars;
}

export async function mintAvatar(provider, address) {
  const contract = await getAvatarContract(provider);
  const signer = provider.getSigner(0);
  const gwei = parseEther('0.001');
  console.log('minting', address);
  const tx = await contract.connect(signer).mint(address, "OG Player", {
    value: gwei,
  });
  console.log(`mintAvatar(${address}) =>`, tx);
  return tx;
}