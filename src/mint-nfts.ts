import * as fs from "fs/promises";
import "dotenv/config";
import {
  generateSigner,
  percentAmount,
  publicKey,
  Umi,
} from "@metaplex-foundation/umi";
import {
  createNft,
  verifyCollectionV1,
  findMetadataPda,
  printSupply,
} from "@metaplex-foundation/mpl-token-metadata";
import { configUmi } from "./utils";
import { join } from "path";
import { PinataSDK } from "pinata-web3";

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.GATEWAY_URL,
});

async function mintNFT(umi: Umi, id: number, ipfsHash: string) {
  if (id < 0 || id >= 10000) {
    throw new Error("Invalid ID");
  }
  const nftSigner = generateSigner(umi);

  await createNft(umi, {
    mint: nftSigner,
    name: "Arian #" + id,
    symbol: "$ARIA",
    uri: "https://gateway.pinata.cloud/ipfs/" + ipfsHash,
    sellerFeeBasisPoints: percentAmount(
      Number.parseFloat(process.env.SALE_ROYALITY_PERCENTAGE!)
    ),
    collection: {
      verified: false,
      key: publicKey(process.env.COLLECTION_MINT_ADDRESS!),
    },
    isMutable: false,
    printSupply: printSupply("Zero"),
    creators: [
      {
        address: publicKey(umi.identity.publicKey),
        verified: true,
        share: 100,
      },
    ],
  }).sendAndConfirm(umi);
  const metadata = findMetadataPda(umi, {
    mint: publicKey(nftSigner.publicKey),
  });
  await verifyCollectionV1(umi, {
    metadata,
    collectionMint: publicKey(process.env.COLLECTION_MINT_ADDRESS!),
    authority: umi.identity,
  }).sendAndConfirm(umi);

  return nftSigner.publicKey;
}

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
  const targetNFTID = Number.parseInt(process.env.NFT_MINTING_MAX_ID!);
  // mint {numberOfNFTsToMint} NFTs at a time
  for (let i = last_minted_id + 1; i < targetNFTID; i++) {
    console.time("Minting NFT with ID " + i);
    const ipfsHash = await uploadMetadata(i);
    await mintNFT(umi, i, ipfsHash);
    // update .last_minted_id file
    await fs.writeFile(
      join(__dirname, ".last_minted_id"),
      i.toString()
    );
    console.timeEnd("Minting NFT with ID " + i);
  }
}
main().catch(console.error);
