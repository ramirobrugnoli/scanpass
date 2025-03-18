import { NextRequest, NextResponse } from "next/server";
import { JWT } from "google-auth-library";

// Cache for JWT token to avoid frequent re-authentication
let cachedToken: { token: string; expiry: number } | null = null;

// Get JWT token, using cache if available
async function getAuthToken() {
  // If we have a cached token that's still valid (with 5-minute buffer)
  if (cachedToken && cachedToken.expiry > Date.now() + 300000) {
    return cachedToken.token;
  }

  try {
    // Get new token
    const credentials = JSON.parse(
      process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || "{}"
    );

    const client = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });

    const token = await client.authorize();

    // Cache the token with expiry time
    cachedToken = {
      token: token.access_token || "",
      expiry: Date.now() + (token.expiry_date || 3600000), // Default 1 hour if no expiry provided
    };

    return cachedToken.token;
  } catch (error) {
    console.error("Error getting auth token:", error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Set up response timing for performance monitoring
    const startTime = Date.now();

    // 1. Receive the file from the client
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Log file details for debugging
    console.log(
      `Processing file: ${file.name}, Size: ${
        file.size / 1024 / 1024
      } MB, Type: ${file.type}`
    );

    // 2. Convert the file to base64
    const buffer = await file.arrayBuffer();
    const base64Content = Buffer.from(buffer).toString("base64");

    console.log(`Base64 conversion completed in ${Date.now() - startTime}ms`);

    // 3. Get credentials
    const credentials = JSON.parse(
      process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || "{}"
    );

    // 4. Get auth token (using cached token if available)
    const token = await getAuthToken();

    console.log(`Auth token retrieved in ${Date.now() - startTime}ms`);

    // 5. Define the parameters
    const projectId = credentials.project_id;
    const location = "us";
    const processorId = "621bbde2682b0324"; // Your processor ID

    // 6. Build the request
    const requestUrl = `https://${location}-documentai.googleapis.com/v1/projects/${projectId}/locations/${location}/processors/${processorId}:process`;

    // 7. Make the request
    console.log(
      `Sending request to Document AI at ${Date.now() - startTime}ms`
    );
    const response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rawDocument: {
          content: base64Content,
          mimeType: file.type || "application/pdf",
        },
      }),
    });

    // 8. Process the response
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Document AI API error response:", errorText);
      throw new Error(
        `Error calling Document AI API: ${response.status} ${errorText}`
      );
    }

    const result = await response.json();
    console.log(`Received Document AI response in ${Date.now() - startTime}ms`);

    // 9. Extract and structure the detected fields
    const document = result.document;
    const entities = document?.entities || [];

    // 10. Organize the results in a useful structure
    const extractedData: Record<string, string> = {};

    entities.forEach((entity: { type: string; mentionText: string }) => {
      if (entity.type && entity.mentionText) {
        extractedData[entity.type] = entity.mentionText;
      }
    });

    console.log(`Processing completed in ${Date.now() - startTime}ms`);

    // 11. Return the results to the client
    return NextResponse.json({
      success: true,
      data: extractedData,
      processingTime: Date.now() - startTime,
    });
  } catch (error: unknown) {
    console.error("Error processing document:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Error processing document",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
