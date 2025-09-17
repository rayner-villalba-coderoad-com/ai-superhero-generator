import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GoogleGenAI } from "@google/genai";

import { Upload } from "@aws-sdk/lib-storage";
import qrcode from 'qrcode';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

// Best Practice: Initialize clients outside the handler
const dynamoDbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDbClient);

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
const s3 = new S3Client({});
const BUCKET_NAME = process.env.UPLOAD_BUCKET;
const REGION = process.env.AWS_REGION || 'us-east-1';

const S3_ENDPOINT_URL = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com`;
const S3_PAGE_URL = `https://${process.env.PAGE_BUCKET}.s3.${REGION}.amazonaws.com`;

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (d) => chunks.push(d));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

async function updateItemInTable(id, payload) {
  const tableName = process.env.DYNAMO_TABLE;
  const updateParts = [];
  const expressionValues = {};
  const expressionNames = {};

  for (const key in payload) {
    if (payload.hasOwnProperty(key)) {
      const namePlaceholder = `#${key}`;
      const valuePlaceholder = `:${key}`;
      
      updateParts.push(`${namePlaceholder} = ${valuePlaceholder}`);
      expressionNames[namePlaceholder] = key;
      expressionValues[valuePlaceholder] = payload[key];
    }
  }

  const updateExpression = `SET ${updateParts.join(', ')}`;

  // 2. Construct the UpdateCommand
  const command = new UpdateCommand({
    TableName: tableName,
    Key: {
      id: id, // Assumes your primary key is named 'id'
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionNames,
    ExpressionAttributeValues: expressionValues,
    ReturnValues: "UPDATED_NEW", // Returns the item with attributes as they appear after the update
  });

  try {
    const response = await docClient.send(command);
    console.log("Successfully updated item:", response.Attributes);
    return response.Attributes;
  } catch (error) {
    console.error("Failed to update item:", error);
    throw error;
  }
}

async function generateQrCode(key) {
  try {
    const originalFilekey = key.replace(/^uploads\//, "").replace(/\.jpg$/i, "");
    const urlToEncode = `${S3_PAGE_URL}/index.html?key=${encodeURIComponent(originalFilekey)}`;
    const qrCodeBuffer = await qrcode.toBuffer(urlToEncode, {
      errorCorrectionLevel: "H",  // better resilience if damaged
      type: "png",
      width: 400,
    });
    const qrCodeImageKey = `qrcodes/${originalFilekey}.png`;

    // Upload to S3
    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: qrCodeImageKey,
        Body: qrCodeBuffer,
        ContentType: 'image/png',
    });

    await s3.send(command);

    const qrCodeUrl = `${S3_ENDPOINT_URL}/${qrCodeImageKey}`;
    return qrCodeUrl;
  } catch (error) {
    console.error("Error generating QR code:", error);
    return null;
  }
}

async function convertImageToComic(bytes, key, imageMetadata) {
  try {
    const imageBase64String = bytes.toString('base64');
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

    const { texts, publicUrls } = await processAndUploadParts(response, key);

    const { vision, spanishVision, superHeroName, spanishSuperHeroName } = await getMotivationalAnalysis({...imageMetadata, text: texts.join('\n')});
    
    return {
      s3_locations: publicUrls[0],
      description: texts.join('\n'),
      vision: vision,
      spanishVision: spanishVision,
      superHeroName: superHeroName,
      spanishSuperHeroName: spanishSuperHeroName,
    };
  } catch (error) {
    console.error("Error processing request:", error);
    
    return {
      s3_locations: '',
      description: '',
      vision: '',
      spanishVision: '',
      superHeroName: '',
      spanishSuperHeroName: '',
    };
  }
}

async function getMotivationalAnalysis({role, fullname, experience, text}) {
  const prompt = `
    You are an expert motivational analyst AI with a knack for crafting inspiring superhero personas in both English and Spanish.
    Your task is to analyze the user's information to identify their inherent "superpowers" and craft a motivational vision.

    **User Information:**
    * **Full Name:** ${fullname}
    * **Role:** ${role}
    * **Experience:** ${experience} years
    * **Personal Text:** <text_to_analyze>${text}</text_to_analyze>

    **Instructions:**
    Perform the following 5 steps and return your response as a single, valid JSON object.

    1.  **Analyze and Synthesize**: Read all the user information provided above to understand their core strengths, skills, and potential impact.

    2.  **Create an English Superhero Name**: Based on the user's **role**, devise a creative, powerful, and inspiring superhero name in English. This name should be returned in a key called "superhero_name".

    3.  **Translate the Superhero Name**: Create a high-quality, creative, and natural-sounding Spanish translation for the superhero name from the previous step. It should not be a literal translation if a more impactful name exists in Spanish. Store this in a key called "nombre_superheroe".

    4.  **Craft an Inspired Vision**: Write **one single, powerful sentence** for the "vision" key. This sentence must:
        * Seamlessly integrate the user's **fullname**, **role**, and **experience**.
        * Synthesize their superpowers into a grand vision of how they can impact the world.
        * Conclude with a phrase that emphasizes the importance of continuous learning and growth.

    5.  **Translate the Vision**: Provide a high-quality, natural-sounding Spanish translation of the vision sentence in the "spanish_vision" key.

    **JSON Output Example:**
    {
      "superhero_name": "The Data Architect",
      "nombre_superheroe": "El Arquitecto de Datos",
      "vision": "Leveraging 15 years as a Data Scientist, John Smith has the power to build data infrastructures that predict the future, a skill honed by a relentless desire to learn.",
      "spanish_vision": "Aprovechando 15 años como Científico de Datos, John Smith tiene el poder de construir infraestructuras de datos que predicen el futuro, una habilidad perfeccionada por un deseo implacable de aprender."
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ text: prompt }],
    });
 
    const rawString = response.text;
    // Find the index of the first '{'
    const startIndex = rawString.indexOf('{');

    // Find the index of the last '}' and add 1 to include it in the slice
    const endIndex = rawString.lastIndexOf('}') + 1;
    const jsonString = rawString.slice(startIndex, endIndex);
    const result = JSON.parse(jsonString);

    return {
      vision: result.vision, 
      spanishVision: result.spanish_vision,
      superHeroName: result.superhero_name,
      spanishSuperHeroName: result.nombre_superheroe
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
    return { texts: [], publicUrls: [] };
  }

  if (!BUCKET_NAME) {
    throw new Error("UPLOAD_BUCKET environment variable is not set.");
  }
  
  const parts = response.candidates[0].content.parts;
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
            // CRITICAL FIX: Generate a unique key for each image to prevent overwrites.
            const originalFilename = key.replace(/^uploads\//, "").replace(/\.jpg$/i, "");
            const imageKey = `comic/${originalFilename}.jpeg`;
            
            // a. Upload image to S3
            const putCommand = new PutObjectCommand({
              Bucket: BUCKET_NAME,
              Key: imageKey,
              Body: imageBuffer,
              ContentType: part.inlineData.mimeType || 'image/jpeg',
            });
            await s3.send(putCommand);

            const publicUrl = `${S3_ENDPOINT_URL}/${imageKey}`;
            return publicUrl;          
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
  const publicUrls = resolvedUrls.filter(url => url !== null);

  // 3. Return the results.
  return { texts, publicUrls };
}

export const handler = async (event) => {
  // S3 put event
  const rec = event.Records?.[0];
  if (!rec) return;

  const bucket = rec.s3.bucket.name;
  const key = decodeURIComponent(rec.s3.object.key.replace(/\+/g, " "));

  // Download uploaded image
  const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));

  const imageMetadata = obj.Metadata;
  const bytes = await streamToBuffer(obj.Body);
  // Generate QR code linking to the image
  const qrCodeImageUrl = await generateQrCode(key);
  // 1) Convert image in a superhero
  const result = await convertImageToComic(bytes, key, imageMetadata);

  // 2) Final JSON payload
  const payload = {
    ...imageMetadata,
    imageKey: key,
    qrCodeImageUrl: qrCodeImageUrl || '',
    comicImage: result?.s3_locations || 'None Superhero',
    superHeroName: result?.superHeroName || 'Unknown Hero',
    spanishSuperHeroName: result?.spanishSuperHeroName || 'Héroe Desconocido',
    vision: result?.vision || '',
    spanishVision: result?.spanishVision || '',
    processedAt: new Date().toISOString(),
  };

  const primaryId = payload?.userid;
  if (primaryId) {
    // 2.1 Update DynamoDB record removing userid from metadata
    const updatePayload = { ...payload };
    delete updatePayload.userid;
    await updateItemInTable(primaryId, updatePayload);
  }

  // 3) Save to results bucket keyed by upload key
  const resultKey = `results/${key.replace(/^uploads\//, "").replace(/\.jpg$/i, "")}.json`;
  await new Upload({
    client: s3,
    params: {
      Bucket: BUCKET_NAME,
      Key: resultKey,
      Body: Buffer.from(JSON.stringify(payload, null, 2)),
      ContentType: "application/json",
    },
  }).done();
};
