import { S3Client, HeadObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({});
const BUCKET_NAME = process.env.UPLOAD_BUCKET;
export const handler = async (event) => {
   const headers = {
    'Access-Control-Allow-Origin': '*', // allow all origins
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Accept': 'application/json',
  };

  const { key } = JSON.parse(event.body || "{}");
  if (!key) {
    return { statusCode: 400, body: "Missing key" };
  }
  const resultKey = `results/${key.replace(/^uploads\//, "").replace(/\.jpg$/i, "")}.json`;
  try {
    const metadata = await s3.send(new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: resultKey,
    }));
  } catch (err) {
    console.log('error: ', err);
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
      // File not ready yet
      console.log("File not ready yet");
      return { statusCode: 202, headers, body: JSON.stringify({ status: "Processing" }) };
      
    } else {
     console.error("Unexpected error:", err);
     return { statusCode: 500, headers, body: JSON.stringify({ error: "Internal Server Error" }) };
    }
  }

  const getCmd = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: resultKey,
  });
  const resultUrl = await getSignedUrl(s3, getCmd, { expiresIn: 300 }); // 1 min
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ resultUrl }),
  };
};