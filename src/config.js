export const AVATAR_CONTRACTS = {
  "0x13881": "0x186A5CdAABdD63F27134067a7B3d37308F7dFeE8"
};

export const GRAPH_ENDPOINTS = {
  "0x13881": "https://api.thegraph.com/subgraphs/name/graphprotocol/avatar"
};

export const USER_TOKEN_Q = `query UserTokens($address: String!) {
  tokens(where: { owner: $address }) {
  id
  owner {
    id
  }
  uri
}`;
