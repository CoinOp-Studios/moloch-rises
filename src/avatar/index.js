import { ethers } from "ethers";

import { AVATAR_CONTRACT } from "../config";
import { avatar } from './avatar';

export function getAvatarContract(provider) {
  return new ethers.Contract(AVATAR_CONTRACT, avatar.abi, provider);
}

export async function getOwnedAvatars(provider, address, callback) {
  const contract = getAvatarContract(provider);
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