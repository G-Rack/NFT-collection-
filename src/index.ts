import * as fs from "fs";
import * as path from "path";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createSignerFromKeypair,
  generateSigner,
  signerIdentity,
  publicKey,
  none,
  PublicKey,
} from "@metaplex-foundation/umi";
import {
  createTree,
  fetchMerkleTree,
  mintToCollectionV1,
  mplBubblegum,
} from "@metaplex-foundation/mpl-bubblegum";
import { percentAmount } from "@metaplex-foundation/umi";
import {
  createNft,
  burnNft,
  mplTokenMetadata,
  fetchDigitalAsset,
} from "@metaplex-foundation/mpl-token-metadata";

const umi = createUmi("https://api.devnet.solana.com")
  .use(mplBubblegum())
  .use(mplTokenMetadata());

const walletFile = fs.readFileSync(
  path.join(__dirname, "./keypair.json"),
  "utf-8" // Read the file as a string
);
const secretKeyArray = JSON.parse(walletFile);
const secretKeyUint8Array = new Uint8Array(secretKeyArray);
let keypair = umi.eddsa.createKeypairFromSecretKey(secretKeyUint8Array);
const signer = createSignerFromKeypair(umi, keypair);
umi.use(signerIdentity(signer));

// const COLLECTION_MINT_ADDRESS = publicKey(
//   "5b5mK3eFWvnGdEG3ypRdh3kmTYM6cEd7zzF7BBQucRew"
// );
// const TREE_ACCOUNT_ADDRESS = publicKey(
//   "8DhSZeSDkRaCEUTrRBjhoLjgcg8CRLeQBDPcfsbzu1Vt"
// );

async function createCollection(
  offchainMetadataURL: string,
  name: string,
  symbol: string,
  sellerFeePercentage: number
) {
  const mint = generateSigner(umi);
  return await createNft(umi, {
    mint,
    name,
    symbol,
    uri: offchainMetadataURL,
    updateAuthority: umi.identity.publicKey,
    sellerFeeBasisPoints: percentAmount(sellerFeePercentage),
    isCollection: true,
    creators: [
      {
        address: keypair.publicKey,
        verified: true,
        share: 100,
      },
    ],
  }).sendAndConfirm(umi);
}

async function createMerkelTree() {
  const merkleTree = generateSigner(umi);
  const builder = await createTree(umi, {
    merkleTree,
    maxDepth: 14,
    maxBufferSize: 64,
    treeCreator: umi.identity,
    public: false,
  });
  return await builder.sendAndConfirm(umi);
}

async function mintToCollection(name: string, metadataURI: string) {
  // return await mintToCollectionV1(umi, {
  //   leafOwner: umi.identity.publicKey,
  //   merkleTree: TREE_ACCOUNT_ADDRESS,
  //   collectionMint: COLLECTION_MINT_ADDRESS,
  //   metadata: {
  //     name: name,
  //     uri: metadataURI,
  //     sellerFeeBasisPoints: 200, // 2%
  //     collection: { key: COLLECTION_MINT_ADDRESS, verified: true },
  //     creators: [
  //       { address: umi.identity.publicKey, verified: true, share: 100 },
  //     ],
  //   },
  // }).sendAndConfirm(umi);
}

(async () => {
  // const colRes = await createCollection(
  //   "ipfs://QmTe47T5EabGCghuhAVHS3o6njyHU8qdQanqo8ryBSGxjB",
  //   "Arian Armny",
  //   "$ARIA",
  //   2
  // );
  // const res = await umi.rpc.getTransaction(colRes.signature, {
  //   commitment: "confirmed",
  // });
  // console.log(JSON.stringify(res?.message));

  // const treeRes = await createMerkelTree();
  // const res = await mintToCollection("Arian #0", "https://close-blush-swordfish.myfilebase.com/ipfs/QmbTKYuhkGb39U4d2YJ5athwzeDz9YNPWxnNpkFJSWCm1h/0.json");
  // console.log(res.result);
})().catch((err) => {
  console.error(err);
});
