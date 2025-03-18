// src/utils/openAiService.ts
import { COUNTRY_CODE_MAP } from "./dataProcessing";
import { PassportResult } from "@/app/types/scan/Iscan";
import { StandardizedData } from "./dataProcessing";

interface OpenAIRequest {
  model: string;
  messages: {
    role: "system" | "user" | "assistant";
    content: string;
  }[];
  temperature: number;
  max_tokens: number;
}

interface OpenAIResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

/**
 * Utiliza la API de OpenAI para estandarizar y corregir datos de pasaportes
 */
/**
 * Valida si una clave de API de OpenAI está configurada
 */
export function isOpenAIConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_OPENAI_API_KEY;
}

/**
 * Utiliza la API de OpenAI para estandarizar y corregir datos de pasaportes
 */
export async function enhancePassportDataWithAI(
  passportData: PassportResult[]
): Promise<StandardizedData[]> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

    if (!apiKey) {
      console.error(
        "No se encontró la clave API de OpenAI. Usando procesamiento estándar."
      );
      // Fallback a procesamiento normal sin IA
      return passportData.map((data) => processPassportDataWithoutAI(data));
    }

    // Convertir los datos a formato JSON para enviar a OpenAI
    const jsonData = JSON.stringify(passportData);

    // Crear el prompt para la API de OpenAI
    const prompt = createAIPrompt(jsonData);

    // Configuración de la solicitud a OpenAI
    const requestData: OpenAIRequest = {
      model: process.env.NEXT_PUBLIC_OPENAI_MODEL || "gpt-4", // Usar modelo configurado o GPT-4 como fallback
      messages: [
        {
          role: "system",
          content:
            "Eres un asistente especializado en procesamiento de datos de pasaportes. Tu tarea es corregir errores de OCR, estandarizar formatos y mejorar la calidad de los datos extraídos.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: parseFloat(
        process.env.NEXT_PUBLIC_OPENAI_TEMPERATURE || "0.3"
      ), // Temperatura configurable
      max_tokens: 4000,
    };

    // Realizar la solicitud a la API de OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      throw new Error(`Error en la API de OpenAI: ${response.statusText}`);
    }

    const data: OpenAIResponse = await response.json();
    const enhancedDataText = data.choices[0].message.content;

    // Parsear la respuesta de la IA a un objeto JSON
    try {
      const enhancedData: StandardizedData[] = JSON.parse(enhancedDataText);
      return enhancedData;
    } catch (error) {
      console.error("Error al parsear la respuesta de OpenAI:", error);
      // Fallback a procesamiento sin IA
      return passportData.map((data) => processPassportDataWithoutAI(data));
    }
  } catch (error) {
    console.error("Error al procesar con OpenAI:", error);
    // Fallback a procesamiento sin IA
    return passportData.map((data) => processPassportDataWithoutAI(data));
  }
}

/**
 * Crea el prompt para OpenAI
 */
function createAIPrompt(jsonData: string): string {
  return `
Necesito estandarizar y corregir datos extraídos por OCR de pasaportes.

Estos son los datos en bruto:
${jsonData}

Por favor, procesa estos datos y devuelve un array JSON con objetos que tengan el siguiente formato estandarizado:
{
  "ID": "Número de documento, corregido si tiene errores evidentes",
  "Vto_ID": "Fecha de vencimiento en formato DDMMYYYY sin separadores",
  "NUMERO_DE_PAIS": "Código numérico del país según la lista estándar proporcionada",
  "Apellido": "Apellido en MAYÚSCULAS, corregido si tiene errores evidentes",
  "Nombre": "Nombre en MAYÚSCULAS, corregido si tiene errores evidentes",
  "Dirección": "Dirección estandarizada",
  "N": "Número de dirección",
  "Localidad": "Ciudad o localidad",
  "NUMERO_DE_PAIS_2": "Mismo código numérico del país",
  "Sexo": "M o F únicamente",
  "Estado_Civil": "SOLTERO, CASADO, DIVORCIADO, o VIUDO",
  "Fecha_de_Nacimiento": "Fecha en formato DDMMYYYY sin separadores",
  "Lugar_de_nacimiento": "País o ciudad de nacimiento",
  "Profesión": "Profesión si está disponible, o 'NO INFORMA'"
}

Algunas reglas importantes:
1. Corrige errores evidentes de OCR (como confusiones entre '0' y 'O', '1' y 'I', etc.)
2. Para países, usa los códigos numéricos oficiales (ALEMANIA=0, ARGENTINA=1, AUSTRALIA=2, etc.)
3. Estandariza fechas al formato DDMMYYYY sin separadores
4. Nombres y apellidos deben estar en MAYÚSCULAS
5. Sexo debe ser 'M' o 'F'
6. Si no hay profesión, usa 'NO INFORMA'
7. Si no tienes suficiente información para un campo, haz tu mejor estimación basada en los datos disponibles
8. Asegúrate de que la respuesta sea un JSON válido que pueda ser parseado

Por favor, responde ÚNICAMENTE con el array JSON procesado, sin ningún texto adicional antes o después.
`;
}

/**
 * Función de respaldo para procesar datos sin IA
 * (usa la función existente de dataProcessing.ts)
 */
function processPassportDataWithoutAI(data: PassportResult): StandardizedData {
  // Importa y utiliza la función processPassportData de dataProcessing.ts
  // Esta es una implementación simple para fallback
  return {
    ID: data.document_id || generateRandomId(),
    Vto_ID: formatExpiryDate(data.date_of_expiry || ""),
    NUMERO_DE_PAIS: getCountryCode(data.nationality || data.country || ""),
    Apellido: (data.surname || "").toUpperCase(),
    Nombre: (data.given_name || "").toUpperCase(),
    Dirección: "Calle Principal",
    N: "123",
    Localidad: (data.nationality || data.country || "").toUpperCase(),
    NUMERO_DE_PAIS_2: getCountryCode(data.nationality || data.country || ""),
    Sexo: standardizeGender(data.sex || ""),
    Estado_Civil: "SOLTERO",
    Fecha_de_Nacimiento: formatBirthDate(data.date_of_birth || ""),
    Lugar_de_nacimiento: (data.nationality || data.country || "").toUpperCase(),
    Profesión: "NO INFORMA",
  };
}

/**
 * Genera un ID aleatorio para fallback
 */
function generateRandomId(): string {
  return Math.floor(Math.random() * 100000000).toString();
}

/**
 * Formatea fecha de vencimiento para fallback
 */
function formatExpiryDate(dateStr: string): string {
  if (!dateStr) return "";

  // Intenta extraer sólo dígitos
  const digitsOnly = dateStr.replace(/\D/g, "");
  if (digitsOnly.length >= 8) {
    return digitsOnly.substring(0, 8);
  }

  // Si no hay suficientes dígitos, genera una fecha aleatoria
  const today = new Date();
  const year = today.getFullYear() + 5; // Vencimiento en 5 años
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return day + month + year;
}

/**
 * Formatea fecha de nacimiento para fallback
 */
function formatBirthDate(dateStr: string): string {
  if (!dateStr) return "";

  // Intenta extraer sólo dígitos
  const digitsOnly = dateStr.replace(/\D/g, "");
  if (digitsOnly.length >= 8) {
    return digitsOnly.substring(0, 8);
  }

  // Fecha por defecto
  return "01011990";
}

/**
 * Estandariza género para fallback
 */
function standardizeGender(gender: string): string {
  const upperGender = gender.trim().toUpperCase();

  if (
    upperGender === "M" ||
    upperGender === "MALE" ||
    upperGender.includes("MASC")
  ) {
    return "M";
  } else if (
    upperGender === "F" ||
    upperGender === "FEMALE" ||
    upperGender.includes("FEM")
  ) {
    return "F";
  }

  return "M"; // Valor por defecto
}

/**
 * Obtiene código de país para fallback
 */
function getCountryCode(country: string): number {
  const standardCountry = country.trim().toUpperCase();

  // Mapeo de nombres de países comunes en inglés a su versión en español
  const englishToSpanish: Record<string, string> = {
    GERMANY: "ALEMANIA",
    "UNITED STATES": "ESTADOS UNIDOS",
    USA: "ESTADOS UNIDOS",
    SPAIN: "ESPAÑA",
    ITALY: "ITALIA",
    FRANCE: "FRANCIA",
    "UNITED KINGDOM": "INGLATERRA",
    UK: "INGLATERRA",
    BRAZIL: "BRASIL",
    // Agrega más mapeos según sea necesario
  };

  // Intenta traducir si está en inglés
  const translatedCountry =
    englishToSpanish[standardCountry] || standardCountry;

  // Usa el mapa de códigos de país importado
  return COUNTRY_CODE_MAP[translatedCountry] || 0; // 0 como valor por defecto
}
