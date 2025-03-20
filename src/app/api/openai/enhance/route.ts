// src/app/api/openai/enhance/route.ts - versión final
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { PassportResult } from "@/app/types/scan/Iscan";

// Inicializar el cliente OpenAI del lado del servidor
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Usar variable de entorno del lado del servidor
});

/**
 * Ruta API para mejorar datos de pasaporte utilizando OpenAI
 * Incluye generación de direcciones realistas y únicas para el país específico
 */
export async function POST(request: NextRequest) {
  try {
    // Analizar el cuerpo de la solicitud
    const passportData = (await request.json()) as PassportResult;

    // Determinar el país del pasaporte (nacionalidad o país de emisión)
    const country = passportData.nationality || passportData.country || "";

    // Crear un prompt que explique lo que queremos
    const prompt = `
      Analiza estos datos de pasaporte y mejóralos:
      1. Rellena campos faltantes con valores plausibles basados en el contexto
      2. Estandariza formatos de fecha a DD/MM/YYYY
      3. Genera una dirección ÚNICA Y REALISTA para una persona que vive en ${country}
      
      La dirección debe:
      - Incluir una calle real que exista en ${country}
      - Tener un número de calle aleatorio pero realista (numero random entre 1-5000)
      - Ser formateada según las convenciones de direcciones de ${country}
      - SER COMPLETAMENTE ÚNICA (NO usar direcciones genéricas o muy conocidas)
      
      En el formato final del Excel:
      - "Localidad" será siempre el país de residencia (${country}) en CASTELLANO y SIN TILDES. 
      Por ejemplo: United States -> ESTADOS UNIDOS, France -> FRANCIA, etc.
      - "Lugar de nacimiento" será ÚNICAMENTE el país de origen (sin barrios, ciudades o regiones) también en CASTELLANO y SIN TILDES.
    Por ejemplo: "ESTADOS UNIDOS", "ESPAÑA", "ARGENTINA", etc.
      
      Datos del pasaporte: ${JSON.stringify(passportData, null, 2)}
      
      Devuelve SOLO un objeto JSON válido que incluya los campos originales mejorados y estos campos adicionales:
      - "street_address": la calle con formato apropiado (DEBE SER ÚNICA y específica) SIN NÙMERO, SOLO NOMBRE DE LA CALLE
      - "address_number": el número de la dirección
      
      NO incluyas explicaciones, código de formato markdown, o cualquier cosa que no sea el objeto JSON.
    `;

    // Realizar la llamada a la API de OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // Puedes usar "gpt-3.5-turbo" para mayor eficiencia en costos
      messages: [
        {
          role: "system",
          content:
            "Eres un asistente especializado en procesar datos de pasaportes y generar direcciones realistas ÚNICAS específicas para cada país. Cada dirección debe ser completamente única y verosímil. Debes devolver SOLO datos en formato JSON sin ningún tipo de formateo adicional.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7, // Temperatura más alta para asegurar variedad/unicidad
    });

    // Obtener el contenido de la respuesta
    const enhancedDataString = completion.choices[0].message.content;

    // Analizar el JSON de la respuesta
    try {
      // Eliminar bloques de código markdown si están presentes
      const cleanedJsonString = enhancedDataString
        ? enhancedDataString.replace(/```json\n?|\n?```/g, "")
        : "";

      const enhancedData = JSON.parse(cleanedJsonString) as PassportResult & {
        street_address?: string;
        address_number?: string;
      };

      // Devolver los datos mejorados
      return NextResponse.json({
        success: true,
        data: enhancedData,
      });
    } catch (error) {
      console.error("Error al analizar respuesta de IA:", error);
      // Si falla el análisis, devolver los datos originales
      return NextResponse.json({
        success: true,
        data: passportData,
      });
    }
  } catch (error) {
    console.error("Error al llamar a la API de OpenAI:", error);
    return NextResponse.json(
      { error: "Error al mejorar datos de pasaporte" },
      { status: 500 }
    );
  }
}
