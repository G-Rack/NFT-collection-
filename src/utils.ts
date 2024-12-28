import "dotenv/config";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createSignerFromKeypair,
  signerIdentity,
  Umi,
} from "@metaplex-foundation/umi";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { derivePath } from "ed25519-hd-key";

function getKeypairFromMnemonic(umi: Umi, mnemonic: string) {
  const seed = require("bip39").mnemonicToSeedSync(mnemonic); // Get seed from mnemonic
  const derivationPath = "m/44'/501'/0'/0'"; // Solana standard derivation path
  const derivedSeed = derivePath(derivationPath, seed.toString("hex")).key;
  const keypair = umi.eddsa.createKeypairFromSeed(derivedSeed); // Generate Solana Keypair
  return keypair;
}

export async function configUmi() {
  let keys: {
    mnemonic: string | undefined;
    privateKey: string | undefined;
  } = {
    mnemonic: undefined,
    privateKey: undefined,
  };
  if (process.env.MNEMONIC && process.env.MNEMONIC.trim() !== "") {
    keys.mnemonic = process.env.MNEMONIC;
  } else if (
    process.env.PRIVATE_KEY &&
    process.env.PRIVATE_KEY.trim() !== "" &&
    !process.env.PRIVATE_KEY.includes("[")
  ) {
    keys.privateKey = process.env.PRIVATE_KEY;
  }
  const umi = createUmi(process.env.SOLANA_RPC!, {
    commitment: "finalized",
  }).use(mplTokenMetadata());

  let keypair = undefined;

  if (keys && keys.mnemonic) {
    console.log("Using mnemonic");
    keypair = getKeypairFromMnemonic(umi, keys.mnemonic);
  } else if (keys && keys.privateKey) {
    console.log("Using private key");
    // private key is exported key from phantom which is a hex string
    const bs58 = await import("bs58");
    const privateKeyBytes = bs58.default.decode(keys.privateKey);
    keypair = umi.eddsa.createKeypairFromSecretKey(privateKeyBytes);
  } else {
    console.log("Using private key from env");
    const secret_key = Uint8Array.from(JSON.parse(process.env.PRIVATE_KEY!));
    keypair = umi.eddsa.createKeypairFromSecretKey(secret_key);
  }
  const signer = createSignerFromKeypair(umi, keypair);
  umi.use(signerIdentity(signer));
  return umi;
}
