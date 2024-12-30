import { createTree } from "@metaplex-foundation/mpl-bubblegum";
import {
  generateSigner,
  PublicKey,
  publicKey,
  Umi,
} from "@metaplex-foundation/umi";
import { configUmi } from "./utils";

async function createMerkelTree(umi: Umi): Promise<PublicKey<string>> {
  const merkleTree = generateSigner(umi);
  console.log("Creating Merkle Tree...");
  const createTreeTx = await createTree(umi, {
    merkleTree,
    maxDepth: 14, // tree depth
    canopyDepth: 8, // canopy depth
    maxBufferSize: 64, // Concurrency Buffer
    public: false,
  });

  await createTreeTx.sendAndConfirm(umi);
  return merkleTree.publicKey;
}

async function main() {
  const umi = await configUmi();
  const merkleTreeAddress = await createMerkelTree(umi);
  console.info(
    "Merkle Tree Public Key:",
    merkleTreeAddress,
    "\nStore this address as you will need it later."
  );
}
main().catch(console.error);
