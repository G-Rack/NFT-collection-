import {
  mintToCollectionV1,
} from "@metaplex-foundation/mpl-bubblegum";
import {
  PublicKey,
  publicKey,
  Umi,
} from "@metaplex-foundation/umi";
import fs from "fs/promises";
import { configUmi } from "./utils";
import { join } from "path";
import { PinataSDK } from "pinata-web3";

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.GATEWAY_URL,
});

async function uploadMetadata(nft_id: number) {
  if (nft_id < 0 || nft_id >= 10000) {
    throw new Error("Invalid ID");
  }
  const metadataFile = `${nft_id}.json`;
  const metadataDirectoryPath = join(__dirname, "assets/nfts/metadata");
  const metadataFilePath = join(metadataDirectoryPath, metadataFile);

  const metadataBlob = new Blob([await fs.readFile(metadataFilePath)], {
    type: "application/json",
  });
  const metadataFileObj = new File([metadataBlob], metadataFile, {
    type: "application/json",
  });
  const metadataUpload = await pinata.upload
    .file(metadataFileObj, {
      metadata: {
        name: metadataFile,
      },
    })
    .group(process.env.GROUP_ID!)
    .cidVersion(0);
  return metadataUpload.IpfsHash;
}

const mintCNFT = async (
  umi: Umi,
  id: number,
  ipfsHash: string,
  merkleTreeAddress: PublicKey<string>
) => {
  await mintToCollectionV1(umi, {
    leafOwner: umi.identity.publicKey,
    merkleTree: merkleTreeAddress,
    collectionMint: publicKey(process.env.COLLECTION_MINT_ADDRESS!),
    metadata: {
      name: "Arian #" + id,
      symbol: "$ARIA",
      uri: "https://gateway.pinata.cloud/ipfs/" + ipfsHash,
      sellerFeeBasisPoints: Math.ceil(
        Number.parseFloat(process.env.SALE_ROYALITY_PERCENTAGE!) * 100
      ),
      isMutable: false,
      collection: {
        key: publicKey(process.env.COLLECTION_MINT_ADDRESS!),
        verified: true,
      },
      creators: [
        {
          address: umi.identity.publicKey,
          verified: true,
          share: 100,
        },
      ],
    },
  }).sendAndConfirm(umi, { send: { commitment: "finalized" } });
};

async function main() {
  let last_minted_id = -1;

  // check if .last_minted_id file exists
  try {
    const lastMintedIdFile = await fs.readFile(
      join(__dirname, ".last_minted_id"),
      "utf-8"
    );
    last_minted_id = Number.parseInt(lastMintedIdFile);
  } catch (e) {
    console.log("No .last_minted_id file found, starting from 0");
  }

  const umi = await configUmi();
  const targetNFTID = Number.parseInt(process.env.NFT_MINTING_MAX_ID! || "10000");
  const merkleTreeAddress = process.env.MERKEL_TREE_ADDRESS;

  if (!merkleTreeAddress) {
    throw new Error("MERKLE_TREE_ADDRESS not provided");
  }

  // mint {numberOfNFTsToMint} NFTs at a time
  for (let i = last_minted_id + 1; i < targetNFTID; i++) {
    console.time("Minting NFT with ID " + i);
    const ipfsHash = await uploadMetadata(i);
    await mintCNFT(umi, i, ipfsHash, publicKey(merkleTreeAddress));
    // update .last_minted_id file
    await fs.writeFile(join(__dirname, ".last_minted_id"), i.toString());
    console.timeEnd("Minting NFT with ID " + i);
  }
}
main().catch(console.error);
