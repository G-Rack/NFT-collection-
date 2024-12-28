import "dotenv/config";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createSignerFromKeypair,
  signerIdentity,
} from "@metaplex-foundation/umi";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { configUmi } from "./utils";

async function main() {
  const umi = await configUmi();
  console.log(umi.identity.publicKey.toString());
}

main();