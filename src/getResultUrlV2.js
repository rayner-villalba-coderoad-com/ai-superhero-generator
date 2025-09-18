import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

// Client initialization remains the same (outside the handler)
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  const tableName = process.env.DYNAMO_TABLE;

  try {
    // 1. Check if there's a body and parse it from a JSON string
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Error: Missing request body." }),
      };
    }

    const data = JSON.parse(event.body);
    const itemId = data.id; // Get the 'id' from the parsed body

    if (!itemId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Error: Missing 'id' in request body." }),
      };
    }

    // 2. The DynamoDB GetCommand is exactly the same
    const command = new GetCommand({
      TableName: tableName,
      Key: {
        id: itemId,
      },
    });

    const response = await docClient.send(command);

    // 3. The response logic is also exactly the same
    if (response.Item) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(response.Item),
      };
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Item not found." }),
      };
    }
  } catch (error) {
    console.error("FAILURE:", error);
    // Handle potential JSON parsing errors or DynamoDB errors
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to process request.", error: error.message }),
    };
  }
};