import { PinataSDK } from "pinata-web3";
import fs from "fs/promises";
import { join } from "path";
require("dotenv").config();

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.GATEWAY_URL,
});

const imageDirectoryPath = join(__dirname, "assets/nfts/images");
const metadataDirectoryPath = join(__dirname, "assets/nfts/metadata");

async function uploadNFT(nft_id: number) {
  // For NFTs we have 10000 images from 1.png to 10000.png
  if (nft_id < 0 || nft_id >= 10000) {
    throw new Error("Invalid ID");
  }
  try {
    const file = `${nft_id}.png`;
    const filePath = join(imageDirectoryPath, file);
    const blob = new Blob([await fs.readFile(filePath)], {
      type: "image/png",
    });
    const fileObj = new File([blob], file, { type: "image/png" });
    const upload = await pinata.upload
      .file(fileObj, {
        metadata: {
          name: file,
        },
      })
      .group(process.env.GROUP_ID!)
      .cidVersion(0);

    // now lets read the metadata file and update the image url
    const metadataFile = `${nft_id}.json`;
    const metadataFilePath = join(metadataDirectoryPath, metadataFile);

    const metadata = JSON.parse(await fs.readFile(metadataFilePath, "utf-8"));
    metadata.image = `https://gateway.pinata.cloud/ipfs/${upload.IpfsHash}?ext=png`;
    metadata.properties.files[0].uri = metadata.image;

    await fs.writeFile(metadataFilePath, JSON.stringify(metadata, null, 2));
    // now we have to upload the metadata file as well
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
  } catch (error) {
    console.log(error);
  }
}

async function main() {
  let batch = 1;
  for (let i = 0; i <= 10000; i += 4) {
    console.time(`Batch: ${batch}`);
    await Promise.all([
      uploadNFT(i),
      uploadNFT(i + 1),
      uploadNFT(i + 2),
      uploadNFT(i + 3),
    ]);
    console.timeEnd(`Batch: ${batch}`);
    batch++;
  }
}

main().then(() => {
  console.log("ALL DONE!");
});
