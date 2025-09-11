import { S3Client, GetObjectCommand, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";
import { RekognitionClient, RecognizeCelebritiesCommand, CompareFacesCommand } from "@aws-sdk/client-rekognition";
import { SageMakerRuntimeClient, InvokeEndpointCommand } from "@aws-sdk/client-sagemaker-runtime";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { Upload } from "@aws-sdk/lib-storage";
import { Readable } from "stream";


const s3 = new S3Client({});
const rek = new RekognitionClient({});
const sagemaker = new SageMakerRuntimeClient();

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (d) => chunks.push(d));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}
async function recognizeCelebrities(imageBytes) {
  const { CelebrityFaces } = await rek.send(
    new RecognizeCelebritiesCommand({ Image: { Bytes: imageBytes } })
  );
  if (!CelebrityFaces || CelebrityFaces.length === 0) return null;
  
  // Prefer high confidence
  const best = [...CelebrityFaces].sort((a, b) => (b.MatchConfidence ?? 0) - (a.MatchConfidence ?? 0))[0];
  return {
    method: "RecognizeCelebrities",
    name: best?.Name,
    confidence: best?.MatchConfidence,
  };
}

async function convertImageToComic(bytes, key) {
  try {
    const imageBase64String = bytes.toString('base64');
    const PROMPT = "Close-up portrait of a powerful superhero, illustrated in the style of Modern Age DC Black Label and Marvel comics. Artwork inspired by Jim Lee and Frank Miller, featuring dramatic heavy inking, deep shadows, and high-contrast noir lighting. Muted, gritty color palette with a cinematic, dark atmosphere. Strong jawline, intense expression, heroic presence, hyper-detailed comic book illustration, sharp linework, and bold contrast.";
    const NEGATIVE_PROMPT = "blurry, out of focus, low resolution, bad anatomy, extra limbs, extra fingers, missing fingers, distorted face, deformed body, mutated, poorly drawn, cartoonish, ugly, low quality, pixelated, duplicate, cropped, watermark, signature, text, error, jpeg artifacts, oversaturated, flat shading";
    const payload = {
      "prompt": PROMPT,
      "image": imageBase64String,
      "num_inference_steps": 30,
      "guidance_scale": 7.5,
      "negative_prompt": NEGATIVE_PROMPT,
      "num_images_per_prompt": 4,
      "seed": 1,
      "batch_size": 2,
      "strength": 0.5,
      "scheduler": "DDIMScheduler"
    };
    const imageGenerationResponse = await queryEndpoint(payload);
    const s3Locations = await parseAndSaveImages(imageGenerationResponse, key);

      // 4. Return a success response
    return {
      s3_locations: s3Locations[0],
    };
  } catch (error) {
    console.error("Error processing request:", error);
    
    return {
      s3_locations: '',
    };
  }
}

async function queryEndpoint(payload) {
  const endpointName = process.env.SAGEMAKER_ENDPOINT;

  const command = new InvokeEndpointCommand({
    EndpointName: endpointName,
    ContentType: "application/json",
    Accept: "application/json",
    // The body must be a Uint8Array
    Body: new TextEncoder().encode(JSON.stringify(payload)),
  });

  return await sagemaker.send(command);
}

async function parseAndSaveImages(queryResponse, key) {
  // Decode the Uint8Array body to a string, then parse as JSON
  const responseBodyString = new TextDecoder().decode(queryResponse.Body);
  const responseDict = JSON.parse(responseBodyString);

  const generatedImages = responseDict.generated_images; // As per the Python example
  if (!generatedImages || !Array.isArray(generatedImages)) {
    throw new Error("Invalid response format from SageMaker endpoint.");
  }

  // Create an array of upload promises to run them in parallel
  const uploadPromises = generatedImages.map(async(base64Image) => {
     // 1. Prepare the image and S3 command
    const imageBuffer = Buffer.from(base64Image, 'base64');
    const imageKey = `comic/${key.replace(/^uploads\//, "")}`;
    
    const BUCKET_NAME = process.env.RESULTS_BUCKET; // Ensure this environment variable is set

    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: imageKey,
      Body: imageBuffer,
      ContentType: 'image/jpeg', // Assuming JPEG, adjust if necessary
    });

     // 2. Upload the image to S3
    await s3.send(putCommand);

    // 3. Create a command to get the object
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: imageKey,
    });

    // 4. Generate and return the presigned URL (expires in 5 minutes)
    return await getSignedUrl(s3, getCommand, { expiresIn: 300 });
  });

  // Wait for all uploads to complete
  return await Promise.all(uploadPromises);
}


export const handler = async (event) => {
  // S3 put event
  const rec = event.Records?.[0];
  if (!rec) return;

  const bucket = rec.s3.bucket.name;
  const key = decodeURIComponent(rec.s3.object.key.replace(/\+/g, " "));

  // Download uploaded image
  const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const bytes = await streamToBuffer(obj.Body);

  // 1) Try celebrity recognition
  let result = await recognizeCelebrities(bytes);

  // 2) Fallback: compare to our artist gallery
  if (!result) {
    result = await convertImageToComic(bytes, key);
  }

  // 3) Final JSON payload
  const payload = {
    imageKey: key,
    comicImage: result?.s3_locations || 'None_Comic',
    detected: result?.name || null,
    confidence: result?.confidence || 0,
    method: result?.method || "Analysis with Sagemaker",
    processedAt: new Date().toISOString(),
  };


  // 4) Save to results bucket keyed by upload key
  const resultKey = `results/${key.replace(/^uploads\//, "").replace(/\.jpg$/i, "")}.json`;
  await new Upload({
    client: s3,
    params: {
      Bucket: process.env.RESULTS_BUCKET,
      Key: resultKey,
      Body: Buffer.from(JSON.stringify(payload, null, 2)),
      ContentType: "application/json",
    },
  }).done();
};
