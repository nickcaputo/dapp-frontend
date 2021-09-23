import { Grid, VStack } from "@chakra-ui/layout";
import Head from "next/head";
import React, {useEffect, useState} from "react";
import NFTItemManager from "../components/nft-item-manager";
import NFTItemOS from '../components/nft-item-opensea';
import NFTItem from '../components/nft-item';
import NextLink from "next/link";
import styles from "../styles/my-nfts.module.css";
import FrakButton from "../components/button";
import { useWeb3Context } from '../contexts/Web3Context';
import { utils } from 'ethers';
import { getSubgraphData } from '../utils/graphQueries';
import { createObject, createOpenSeaObject } from '../utils/nftHelpers';
import {
  rescueEth,
  claimFraktalSold,
  fraktionalize,
  claimERC1155,
  claimERC721,
  approveMarket,
  importERC721,
  importERC1155,
  getApproved,
  getLockedTo,
  makeOffer
} from '../utils/contractCalls';
import { assetsInWallet } from '../utils/openSeaAPI';
import { useRouter } from 'next/router';

export default function MyNFTsView() {
  const router = useRouter();
  const { account, provider, contractAddress } = useWeb3Context();
  const [nftItems, setNftItems] = useState();
  const [fraktionItems, setFraktionItems] = useState();
  const [totalBalance, setTotalBalance] = useState(0);
  const [offers, setOffers] = useState();

  async function getAccountFraktions(){
    let objects = await getSubgraphData('wallet',account.toLocaleLowerCase())
    return objects;
  };
  async function getUserOffers(){
    let objects = await getSubgraphData('offers',account.toLocaleLowerCase())
    return objects;
  };

  async function takeOutOffer(address) {
    try {
      makeOffer(
        utils.parseEther('0'),
        address,
        provider,
        contractAddress).then(()=>{
          router.push('/my-nfts');
        })
    }catch(e){
      console.log('There has been an error: ',e)
    }
  }

  async function claimNFT(item){
    let approved = await getApproved(account, contractAddress, provider, item.id);
    let done:Boolean;
    if(!approved){
      done = await approveContract(item.id);
    } else {
      done = true;
    }
    let tx;
    if(done){
      if(item.collateralType == 'ERC721'){
        tx = await claimERC721(item.marketId, provider, contractAddress)
      }else{
        tx = await claimERC1155(item.marketId, provider, contractAddress)
      }
    }
    if(tx){
      router.push('/my-nfts');
    }
  }

  async function claimFraktal(id) {
    try {
      await claimFraktalSold(id, provider, contractAddress).then(()=>{
        router.push('/my-nfts');
      });
    } catch(err){
      console.log('Error: ',err);
    }
  }

  async function approveContract(tokenAddress){
    let done = await approveMarket(contractAddress, provider, tokenAddress)
    return done;
  }

  async function importNFT(item){
    let res;
    let done;
    let approved = await getApproved(account, contractAddress, provider, item.id);
    if(!approved){
      done = await approveContract(item.id);
    } else {
      done = true;
    }
    // overflow problem with opensea assets.. subid toooo big
    if(done){
      if(item.token_schema == 'ERC721'){
        res = await importERC721(parseInt(item.tokenId), item.id, provider, contractAddress)
      } else if (item.token_schema = 'ERC1155' && item.marketId == null) {
        res = await importERC1155(parseInt(item.tokenId), item.id, provider, contractAddress)
      } else {
        res = await approveContract(item.id).then(()=>fraktionalize(parseInt(item.marketId), provider, contractAddress));
      }
    }
    if(res){
      router.reload();
    }
  }
  useEffect(async()=>{
    if(account) {
      let openseaAssets = await assetsInWallet(account);
      let fobjects = await getAccountFraktions();
      let nftsERC721_wallet;
      let nftsERC1155_wallet;
      let totalNFTs = [];
      if(openseaAssets && openseaAssets.assets && openseaAssets.assets.length){
          nftsERC721_wallet = openseaAssets.assets.filter(x=>{return x.asset_contract.schema_name == 'ERC721'})
          if(nftsERC721_wallet && nftsERC721_wallet.length){
            totalNFTs = totalNFTs.concat(nftsERC721_wallet);
          }
          nftsERC1155_wallet = openseaAssets.assets.filter(x=>{return x.asset_contract.schema_name == 'ERC1155' && x.token_id != '1'})
          totalNFTs = nftsERC721_wallet.concat(nftsERC1155_wallet);
          let nftObjects = await Promise.all(totalNFTs.map(x=>{return createOpenSeaObject(x)}))
          if(nftObjects){
            let nftObjectsClean = nftObjects.filter(x=>{return x != null && x.imageURL.length});
            setNftItems(nftObjectsClean)
        }else{
          setNftItems([])
        }
      }

      if(fobjects && fobjects.users.length){
        let userBalance = fobjects.users[0].balance
        setTotalBalance(parseFloat(userBalance)/10**18)

        let fraktionsObjects = await Promise.all(fobjects.users[0].fraktions.map(x=>{return createObject(x.nft)}))
        if(fraktionsObjects){
          let fraktionsObjectsClean = fraktionsObjects.filter(x=>{return x != null});
          setFraktionItems(fraktionsObjectsClean)
        }else{
          setFraktionItems([])
        }
      }
    }
  },[account]);

  useEffect(async () => {
    if(account){
      let userOffers;
      let fetchOffers = await getUserOffers();
      let openSeaAssetsAddresses=[];
      if(nftItems){
        openSeaAssetsAddresses = nftItems.map(x=>{return x.id});
      }
      if(fetchOffers){
        let offersMade = fetchOffers.users[0].offersMade.filter(x=> {return !openSeaAssetsAddresses.includes(x.fraktal.id) && (x.fraktal.status == "open" || x.fraktal.status == "sold")})
        if(offersMade && offersMade.length){
          let soldOffers = offersMade.filter(x=> {return x.fraktal.status == 'sold'})
          let openOffers = offersMade.filter(x=> {return x.fraktal.status != 'sold'})
          if(soldOffers){
            soldOffers.map(async x => {
              getLockedTo(account,x.fraktal.id,provider).then(votes => {
                if(votes >= 8000){
                  Object.assign(x.fraktal, { status: 'buyer'});
                }
              })
            })
          }
          let totalOffers = openOffers.concat(await soldOffers)
          userOffers = await Promise.all(totalOffers.map(x=>{return createObject(x.fraktal)}))
          setOffers(userOffers);
        }
      }
    }
  },[account, nftItems]);

  return (
    <VStack spacing='0' mb='12.8rem'>
      <Head>
        <title>Fraktal - My NFTs</title>
      </Head>
      <div className={styles.header}>
        My NFTs
      </div>
      {nftItems?.length ? (
        <Grid
          mt='40px !important'
          ml='0'
          mr='0'
          mb='5.6rem !important'
          w='100%'
          templateColumns='repeat(3, 1fr)'
          gap='3.2rem'
        >
          {nftItems.map(item => (
            <div key={item.id}>

            {item.collateral?
              <NFTItemOS
                item={item}
                CTAText={"Claim collateral"}
                onClick={()=>claimNFT(item)}
              />
               :
              <NFTItemOS
                item={item}
                CTAText={"Import"}
                onClick={()=>importNFT(item)}
              />
            }
            </div>
          ))}
        </Grid>
      ) : (
        <div style={{ marginTop: "8px" }}>
          <div className={styles.descText}>
            Transfer NFT to your wallet or Mint a new NFT.
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <NextLink href={`/mint-nft`}>
              <FrakButton style={{ width: "240px", marginTop: "24px" }}>
              Mint NFT
              </FrakButton>
            </NextLink>
          </div>
        </div>
      )}
      {/*///////////////////////////////////*/}
      <div className={styles.header2}>My Fraktions</div>
      {fraktionItems?.length ? (
        <div style={{ marginTop: "16px" }}>
          <div className={styles.subText}>You have earned</div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: "8px",
            }}
          >
            <div className={styles.claimContainer}>
              <div style={{ marginLeft: "24px" }}>
                <div className={styles.claimHeader}>ETH</div>
                <div className={styles.claimAmount}>{Math.round(totalBalance*1000)/1000}</div>
              </div>
              <div className={styles.claimCTA} onClick={()=>rescueEth(provider, contractAddress).then(()=>router.reload())}>Claim</div>
            </div>
          </div>
          <Grid
            mt='40px !important'
            ml='0'
            mr='0'
            mb='5.6rem !important'
            w='100%'
            templateColumns='repeat(3, 1fr)'
            gap='3.2rem'
          >
            {fraktionItems && fraktionItems.map(item => (
              <div key={item.id}>
                <NFTItemManager item={item} />
              </div>
            ))}
          </Grid>
        </div>
      ) : (
        <div style={{ marginTop: "8px" }}>
          <div className={styles.descText}>
            Head over to the marketplace and invest to get some Fraktions!
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <NextLink href={"/"}>
              <FrakButton
                isOutlined
                style={{ width: "240px", marginTop: "24px" }}
              >
                Back to Marketplace
              </FrakButton>
            </NextLink>
          </div>
        </div>
      )}
      {/*///////////////*/}
      {offers && offers.length &&
        <div>
          <div className={styles.header2}>OFFERS</div>
          <Grid
          mt='40px !important'
          ml='0'
          mr='0'
          mb='5.6rem !important'
          w='100%'
          templateColumns='repeat(3, 1fr)'
          gap='3.2rem'
          >
          {offers && offers.map(item => (
            <div key={item.id}>
            {item.status == "buyer" ?
              <div>
                <NFTItem
                  item={item}
                  onClick={()=>claimFraktal(item.marketId)}
                  CTAText="Claim Fraktal"
                />
              </div>
              :
              <div>
                <NFTItem
                  item={item}
                  onClick={()=>takeOutOffer(item.id)}
                  CTAText="Take out offer"
                />
              </div>
            }
            </div>
          ))}
          </Grid>
        </div>
      }
    </VStack>
  )
};
