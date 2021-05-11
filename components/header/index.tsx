import { Box, Flex, HStack, Image, Link } from "@chakra-ui/react";
import NextLink from "next/link";
import FrakButton from "../button";

const Header = () => {
  // TODO: Make wallet connection functional
  const walletAddress = undefined;
  // const walletAddress = "undefined";

  return (
    <Box minH="10rem" py="2.6rem" as="header" bg={"white"}>
      <Flex maxW="96.4rem" mx="auto" as="nav" justify="space-between">
        <HStack spacing="8">
          <NextLink href="/">
            <Link>
              <Image src="/logo.svg" alt="logo" width="75px" />
            </Link>
          </NextLink>
        </HStack>
        <Flex align="center">
          <HStack
            spacing="3.2rem"
            mr="3.2rem"
            display={{ base: "none", md: "flex" }}
          >
            <NextLink href="/mint-nft">
              <Link className="semi-16">Mint NFT</Link>
            </NextLink>
            <NextLink href="/marketplace">
              <Link className="semi-16">Marketplace</Link>
            </NextLink>
            <NextLink href="/artists">
              <Link className="semi-16">Artists</Link>
            </NextLink>
            <NextLink href="/dao">
              <Link className="semi-16">DAO</Link>
            </NextLink>
            <NextLink href="/learn-more">
              <Link className="semi-16">Learn More</Link>
            </NextLink>
          </HStack>
          {!walletAddress ? (
            <FrakButton>Connect Wallet</FrakButton>
          ) : (
            <NextLink href="/my-nfts">
              <FrakButton isOutlined>{walletAddress} | View my NFTs</FrakButton>
            </NextLink>
          )}
        </Flex>
      </Flex>
    </Box>
  );
};

export default Header;