import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GoogleGenAI } from "@google/genai";

import { Upload } from "@aws-sdk/lib-storage";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
const s3 = new S3Client({});

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (d) => chunks.push(d));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

async function convertImageToComic(bytes, key) {
  try {
    const imageBase64String = bytes.toString('base64');
    console.log('imageBase', imageBase64String);
    const PROMPT = `You are a world-class concept artist for a blockbuster movie studio. Your task is to take this user-submitted photo and design a brand-new, iconic superhero for a cinematic universe.

      **Your Process:**
      You will first deconstruct the photo, identifying the subject's core personality from their expression and the environment's hidden potential for a compelling origin story.

      **The Hero Concept:**
      Generate a full-body, cinematic poster-style image of the superhero derived from the photo.
      * **Origin:** The hero's powers stem directly from a key element in the photo's background.
      * **Core Abilities:** Superhuman strength (powerful physique) and hypersonic speed (visualized with subtle atmospheric distortion).
      * **Unique Power:** A unique, visually spectacular power drawn from the environment's essence.
      * **Look & Feel:** The costume should feel practical yet iconic, blending the colors of the user's attire with materials and textures from their surroundings. The final character must look powerful, determined, and ready for action.

      The final image must be ultra-detailed, with cinematic lighting and a level of quality suitable for a movie poster.`;
    const prompt = [
      { text: PROMPT  },
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64String,
        },
      },
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents: prompt,
    });
    
    const { texts, presignedUrls } = await processAndUploadParts(response, key);
  
    const { vision, spanishVision} = await getMotivationalAnalysis(texts.join('\n'));
    
    return {
      s3_locations: presignedUrls[0],
      description: texts.join('\n'),
      vision: vision,
      spanishVision: spanishVision,
    };
  } catch (error) {
    console.error("Error processing request:", error);
    
    return {
      s3_locations: '',
      description: '',
      vision: '',
      spanishVision: '',
    };
  }
}

async function getMotivationalAnalysis(text) {
  const prompt = `
    You are a motivational analyst AI. Your task is to analyze the following text to identify the user's inherent "superpowers".
    The text to analyze is enclosed in <text_to_analyze> tags.

    Perform the following steps and return your response as a single valid JSON object with two keys: "vision" and "spanish_vision".

    1.  *Create an Inspired Vision*: In the "vision" key, write ONE powerful, inspiring sentence that synthesizes these superpowers into a vision of how this person can change the world, ending with a reference to the importance of continuous learning.
    2.  *Spanish Translation*: In the "spanish_vision" key, provide a high-quality, natural-sounding Spanish translation of the English paragraph you wrote for the vision key.
    <text_to_analyze>
    ${text}
    </text_to_analyze>
  `;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ text: prompt }],
    });
 
    console.log('Short description response: ', response.text);
    const rawString = response.text;
    // Find the index of the first '{'
    const startIndex = rawString.indexOf('{');

    // Find the index of the last '}' and add 1 to include it in the slice
    const endIndex = rawString.lastIndexOf('}') + 1;
    const jsonString = rawString.slice(startIndex, endIndex);
    const result = JSON.parse(jsonString);

    return {
      vision: result.vision, 
      spanishVision: result.spanish_vision 
    };
  } catch (error) {
    console.error("Error generating summary:", error);
    return '';
  }
}

async function processAndUploadParts(response, key) {
  // Ensure the necessary parts of the response exist
  if (!response?.candidates?.[0]?.content?.parts) {
    console.error("Invalid response structure received.");
    return { texts: [], presignedUrls: [] };
  }

  const BUCKET_NAME = process.env.RESULTS_BUCKET;
  if (!BUCKET_NAME) {
    throw new Error("RESULTS_BUCKET environment variable is not set.");
  }
  
  const parts = response.candidates[0].content.parts;
  console.log('parts:', parts);
  const texts = [];

   // 1. Map over all parts to create an array of promises for the image uploads.
  const uploadPromises = parts
    .map((part, index) => {
      // Handle and collect text parts
      if (part.text) {
        texts.push(part.text);
        return null; // No promise needed for text parts
      } 
      
      // Handle image parts
      if (part.inlineData) {
        // Return a promise for each image.
        // We wrap the logic in an async IIFE (Immediately Invoked Function Expression)
        // to use await within the map's callback.
        return (async () => {
          try {
            const imageBuffer = Buffer.from(part.inlineData.data, "base64");
            console.log('imageBuffer: ', imageBuffer);
            // CRITICAL FIX: Generate a unique key for each image to prevent overwrites.
            const originalFilename = key.replace(/^uploads\//, "");
            const imageKey = `comic/${originalFilename}-part-${index}.jpeg`;
            
            // a. Upload image to S3
            const putCommand = new PutObjectCommand({
              Bucket: BUCKET_NAME,
              Key: imageKey,
              Body: imageBuffer,
              ContentType: part.inlineData.mimeType || 'image/jpeg',
            });
            await s3.send(putCommand);
            
            // b. Generate and return the presigned URL for the uploaded image
            const getCommand = new GetObjectCommand({
              Bucket: BUCKET_NAME,
              Key: imageKey,
            });
            return getSignedUrl(s3, getCommand, { expiresIn: 300 });
            
          } catch (error) {
            console.error(`Failed to process image at index ${index}:`, error);
            return null; // Return null on failure to avoid crashing Promise.all
          }
        })();
      }
      
      return null;
    })
    .filter(promise => promise !== null); // Filter out nulls to get an array of only promises

  // 2. Execute all upload promises in parallel.
  const resolvedUrls = await Promise.all(uploadPromises);

  // Filter out any nulls that may have resulted from individual upload failures.
  const presignedUrls = resolvedUrls.filter(url => url !== null);
  console.log('Presigned URL:', presignedUrls);
  // Log any text that was collected
  if (texts.length > 0) {
      console.log("Collected text parts:\n", texts.join('\n'));
  }

  // 3. Return the results.
  return { texts, presignedUrls };
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

  // 1) Convert image in a superhero
  const result = await convertImageToComic(bytes, key);

  // 2) Final JSON payload
  const payload = {
    imageKey: key,
    comicImage: result?.s3_locations || 'None Superhero',
    detected: result?.name || null,
    confidence: result?.confidence || 0,
    method: result?.method || "Analysis with Google Nano Banana",
    description: result?.description || '',
    vision: result?.vision || '',
    spanishVision: result?.spanishVision || '',
    processedAt: new Date().toISOString(),
  };


  // 3) Save to results bucket keyed by upload key
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
