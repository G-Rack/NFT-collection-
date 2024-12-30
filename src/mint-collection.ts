import "dotenv/config";
import {
  generateSigner,
  percentAmount,
  publicKey,
} from "@metaplex-foundation/umi";
import { createNft, printSupply } from "@metaplex-foundation/mpl-token-metadata";
import { configUmi } from "./utils";

async function main() {
  const umi = await configUmi();
  const collectionSigner = generateSigner(umi);

  await createNft(umi, {
    mint: collectionSigner,
    name: "Arian Army",
    symbol: "$ARIA",
    uri: "https://gateway.pinata.cloud/ipfs/bafkreifagppy7ow57f2coht5ayfzx6q2h6a2ixfjrtbvepny6e6cmbnygm",
    sellerFeeBasisPoints: percentAmount(
      Number.parseFloat(process.env.SELLER_FEE_BASIS_POINTS!)
    ),
    isCollection: true,
    isMutable: false,
    printSupply: printSupply('Zero'),
    creators: [
      {
        address: publicKey(umi.identity.publicKey),
        verified: true,
        share: 100,
      },
    ],
  }).sendAndConfirm(umi);
  console.log(collectionSigner.publicKey.toString());
}
main().catch(console.error);
