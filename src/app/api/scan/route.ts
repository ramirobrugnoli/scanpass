import { NextRequest, NextResponse } from "next/server";
import { JWT } from "google-auth-library";

export async function POST(request: NextRequest) {
  console.log("entro a funcion scan");
  try {
    // 1. Recibe el archivo del cliente
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 2. Convierte el archivo a base64
    const buffer = await file.arrayBuffer();
    const base64Content = Buffer.from(buffer).toString("base64");

    // 3. Configura la autenticación con JWT directamente
    const credentials = JSON.parse(
      process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || "{}"
    );

    const client = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });

    // Obtener el token de forma explícita
    const token = await client.authorize();

    // 5. Define los parámetros
    const projectId = credentials.project_id;
    const location = "us";
    const processorId = "621bbde2682b0324"; // Tu ID de procesador

    // 6. Construye la solicitud
    const requestUrl = `https://${location}-documentai.googleapis.com/v1/projects/${projectId}/locations/${location}/processors/${processorId}:process`;

    console.log("Requesting Document AI with url:", requestUrl);

    // 7. Realiza la solicitud
    const response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rawDocument: {
          content: base64Content,
          mimeType: file.type || "application/pdf",
        },
      }),
    });

    // 8. Procesa la respuesta
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Document AI API error response:", errorText);
      throw new Error(
        `Error calling Document AI API: ${response.status} ${errorText}`
      );
    }

    const result = await response.json();

    // 9. Extrae y estructura los campos detectados
    const document = result.document;
    const entities = document?.entities || [];

    // 10. Organiza los resultados en una estructura útil
    const extractedData: Record<string, string> = {};

    entities.forEach((entity: { type: string; mentionText: string }) => {
      if (entity.type && entity.mentionText) {
        extractedData[entity.type] = entity.mentionText;
      }
    });

    // 11. Devuelve los resultados al cliente
    return NextResponse.json({
      success: true,
      data: extractedData,
      fullDocument: document, // Opcional, para debugging
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
