import { gql, request } from 'graphql-request';
import { utils } from "ethers";
const { CID } = require('ipfs-http-client');

const APIURL = 'https://api.studio.thegraph.com/query/101/fraktal2rinkeby/v0.0.46';

const creator_query = gql`
query($id:ID!){
  fraktalNfts(where:{creator:$id}) {
    id
    marketId
    hash
    owner {
      id
    }
    createdAt
    creator {
      id
    }
  }
  }
`;
const owner_query = gql`
query($id:ID!){
  fraktalNfts(where:{owner:$id}) {
    id
    marketId
    hash
    createdAt
    status
    offers {
      offerer {
        id
      }
      value
      votes
    }
    revenues {
      tokenAddress
      value
    }
    owner {
      id
    }
    fraktions {
      owner {
        id
      }
      amount
      locked
    }
    creator {
      id
    }
  }
  }
`;
const marketid_query = gql`
query($id:ID!){
  fraktalNfts(where:{marketId:$id}) {
    id
    marketId
    hash
    createdAt
    status
    offers {
      offerer {
        id
      }
      value
      votes
    }
    revenues {
      id
      tokenAddress
      value
    }
    owner {
      id
    }
    fraktions {
      owner {
        id
      }
      amount
      locked
    }
    creator {
      id
    }
  }
}
`;
const all_nfts = gql`
query {
  fraktalNfts(first: 20, orderBy: "createdAt",  orderDirection: "desc") {
    id
    marketId
    hash
    owner {
      id
    }
    createdAt
    creator {
      id
    }
  }
}
`;
const creators_review = gql`
  query{
    users {
      id
      fraktals
      created {
        id
        marketId
        hash
        creator
        owner
        createdAt
      }
    }
  }
`
const creators_small_review = gql`
	query{
		users(first: 10) {
      		id
      		fraktals
      		created {
        		id
        		marketId
        		hash
        		creator
        		owner
        		createdAt
     	 	}
    	}
	}
`


const account_fraktions_query = gql`
  query($id:ID!){
    fraktionsBalances(first:10, where:{owner:$id, amount_gt:0}){
      id
      amount
      owner {
        id
        balance
      }
      nft {
        id
        marketId
        hash
        createdAt
        creator{
          id
        }
        owner{
          id
        }
      }
    }
  }
`
const fraktal_fraktions_query = gql`
  query($id:ID!){
    fraktionsBalances(first:10, where:{nft:$id, amount_gt:0}){
      id
      amount
      owner {
        id
        balance
      }
      nft {
        id
        marketId
        hash
        createdAt
        creator{
          id
        }
        owner{
          id
        }
      }
    }
  }
`
// cannot get to work a fraktal filter (where:{status:"open"})
const listedItems = gql`
  query{
    listItems(first: 100, where:{amount_gt: 0}){
      id
      price
      amount
      gains
      seller {
        id
      }
      fraktal{
        hash
        marketId
        createdAt
        status
        owner {
          id
        }
        fraktions {
          owner{
            id
          }
          amount
        }
        creator {
          id
        }
      }
    }
  }
`;
const listedItemsId = gql`
  query($id:ID!){
    listItems(where:{id:$id, amount_gt: 0}){
      id
      price
      amount
      gains
      seller {
        id
      }
      fraktal {
        status
        id
        hash
        marketId
        createdAt
        transactionHash
        owner{
          id
        }
        fraktions {
          owner{
            id
            balance
          }
          amount
        }
        offers (where: {value_gt: 0}) {
          id
          offerer {
            id
          }
          value
          votes
        }
        creator {
          id
        }
      }
    }
  }
`;
const user_wallet_query = gql`
  query($id:ID!){
    users(where:{id:$id}){
      id
      balance
      fraktals {
        id
      }
      fraktions (where:{amount_gt: 0}){
        amount
        nft {
          id
          marketId
          hash
          createdAt
          creator{
            id
          }
          owner{
            id
          }
          collateral {
            id
            type
          }
        }
      }
    }
  }
`
const user_bought_query = gql`
  query($id:ID!){
    fraktalNfts(where:{status:"sold"}){
      id
      marketId
      hash
      createdAt
      creator{
        id
      }
      owner{
        id
      }
      offers (where:{offerer: $id}){
        value
      }
      collateral {
        id
        type
      }
    }
  }
`

const user_offers_query = gql`
  query($id:ID!){
    users(where:{id:$id}){
      id
      offersMade(where:{value_gt: 0}){
        value
        fraktal{
          id
          marketId
          hash
          createdAt
          creator{
            id
          }
          owner{
            id
          }
          collateral {
            id
            type
          }
          status
        }
      }
    }
  }
`

const fraktalId_query = gql`
  query($id:ID!){
    fraktalNfts(where:{id:$id}) {
      id
      marketId
      hash
      createdAt
      status
      collateral {
        id
        type
      }
      offers {
        offerer {
          id
        }
        value
        votes
      }
      revenues {
        id
        tokenAddress
        value
      }
      owner {
        id
      }
      fraktions {
        owner {
          id
        }
        amount
        locked
      }
      creator {
        id
      }
    }
  }
`;

export const getSubgraphData = async (call, id) => {
  let callGql = calls.find(x => {return x.name == call})
  try {
    const data = await request(APIURL , callGql.call, {id});
    // console.log('data for:',id,' found',data)
    return data;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('error', err);
    return err;
  }
};

const calls = [
  {name: 'account_fraktions', call: account_fraktions_query},
  {name: 'marketid_fraktal', call: marketid_query},
  {name: 'listed_items', call: listedItems},
  {name: 'listed_itemsId', call: listedItemsId},
  {name: 'artists', call: creators_review},
  {name: 'first_artists', call: creators_small_review},
  {name: 'all', call: all_nfts},
  {name: 'creator', call: creator_query},
  {name: 'manage', call: fraktal_fraktions_query},
  {name: 'owned', call: owner_query},
  {name: 'wallet', call: user_wallet_query},
  {name: 'bought', call: user_bought_query},
  {name: 'offers', call: user_offers_query},
  {name: 'fraktal', call: fraktalId_query},
];
