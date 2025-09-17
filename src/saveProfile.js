import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb"
import crypto from "crypto";

const s3 = new S3Client({});
// Initialize the DynamoDB Document Client
const dynamoDbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDbClient);

const generateKeyName = (fullname) => {
  const sanitizedFullname = fullname.trim().toLowerCase();
  return `uploads/${sanitizedFullname.replace(/\s+/g, '_')}-${Date.now()}.jpg`;
};

const saveDataInDynamoDB = async (fullname, email, role, experience, linkedin) => {
  const tableName = process.env.DYNAMO_TABLE;

  const itemToSave = {
    id: crypto.randomUUID(),
    fullname,
    email,
    role,
    experience,
    linkedin,
    createdAt: new Date().toISOString(),
  };
 
  const saveDataCommand = new PutCommand({
    TableName: tableName,
    Item: itemToSave,
  });

  try {
    const response = await docClient.send(saveDataCommand);
    console.log("Success - item saved", response);
    return itemToSave.id;
  } catch (error) {
    console.error("Error saving item", error);
    return null;
  }
};

export const handler = async (event) => {
  const { fullname, email, role, experience, linkedin='' } = JSON.parse(event.body || "{}");

  if (!fullname || !email || !role || !experience) {
    return { statusCode: 400, body: "Missing required fields" };
  }
  //1. Save data in DynamoDB
  const userId = await saveDataInDynamoDB(fullname, email, role, experience, linkedin);

  const key = generateKeyName(fullname);
  const command = new PutObjectCommand({
    Bucket: process.env.UPLOAD_BUCKET,
    Key: key,
    ContentType: "image/jpeg",
    Metadata: {
      "userId": userId,
      "fullname": fullname,
      "email": email,
      "role": role,
      "experience": experience,
      "linkedin": linkedin
    },
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 1 min
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ key, uploadUrl, userId }),
  };
};