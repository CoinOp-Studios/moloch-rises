export const AVATAR_CONTRACTS = {
  "0x13881": "0x186A5CdAABdD63F27134067a7B3d37308F7dFeE8"
};

export const GRAPH_ENDPOINTS = {
  "0x13881": "https://api.thegraph.com/subgraphs/name/0xbeedao/all-mumbai-nfts"
};

export const USER_TOKEN_Q = `
query UserTokens($owner: String!) {
  tokens(where: { owner: $owner }) {
    id,
    owner,
    uri
  }
}
`;
