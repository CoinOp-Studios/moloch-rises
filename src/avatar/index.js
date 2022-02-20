import { ethers } from "ethers";

import { AVATAR_CONTRACTS } from "../config";
import { avatar } from './avatar';

export async function getAvatarContract(provider) {
  const network = await provider.getNetwork();
  const chainId = `0x${network.chainId.toString(16)}`;
  return new ethers.Contract(AVATAR_CONTRACTS[chainId], avatar.abi, provider);
}

export async function getOwnedAvatars(provider, address, callback) {
  const contract = await getAvatarContract(provider);
  console.log(`getOwnedAvatars(${address})`, contract);
  const count = await contract.balanceOf(address);
  console.log('count', count);
  for (let i = 0; i < count; i++) {
    console.log('index', i);
    const tokenID = await contract.tokenOfOwnerByIndex(address, i);
    console.log('tokenID', tokenID);
    if (tokenID) {
      console.log('getting tokenURI');
      const nft = await contract.tokenURI(tokenID);
      callback(nft, i);
    }
  }
  console.log(`${address} owns ${count} avatars`);
  return count;
}