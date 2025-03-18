// src/utils/dataProcessing.ts
import { PassportResult } from "@/app/types/scan/Iscan";

// Define the mapping table from country to country code
export const COUNTRY_CODE_MAP: Record<string, number> = {
  ALEMANIA: 0,
  ARGENTINA: 1,
  ARMENIA: 1,
  AUSTRALIA: 2,
  AUSTRIA: 3,
  BELGICA: 4,
  BOLIVIA: 5,
  BRASIL: 6,
  BULGARIA: 7,
  CANADA: 8,
  CHILE: 9,
  CHINA: 10,
  COLOMBIA: 11,
  CONGO: 12,
  "COREA DEMOCRATICA": 13,
  "COREA REPUBLICANA": 14,
  "COSTA RICA": 15,
  CROACIA: 16,
  CUBA: 17,
  DINAMARCA: 18,
  ECUADOR: 19,
  EGIPTO: 20,
  "EL SALVADOR": 21,
  ESLOVAQUIA: 22,
  ESLOVENIA: 23,
  ESPAÑA: 24,
  "ESTADOS UNIDOS": 25,
  FILIPINAS: 26,
  FINLANDIA: 27,
  FRANCIA: 28,
  GRECIA: 29,
  GUATEMALA: 30,
  GUYANA: 31,
  HAITI: 32,
  HONDURAS: 33,
  CHINA2: 34,
  HUNGRIA: 35,
  INDIA: 36,
  INDONESIA: 37,
  IRLANDA: 38,
  ISLANDIA: 39,
  ISRAEL: 40,
  ITALIA: 41,
  JAMAICA: 42,
  JAPON: 43,
  JORDANIA: 44,
  KENYA: 45,
  LIBANO: 46,
  LITUANIA: 47,
  LUXEMBURGO: 48,
  MALASIA: 49,
  MARRUECOS: 50,
  MEXICO: 51,
  MONACO: 52,
  NICARAGUA: 53,
  NORUEGA: 54,
  "NUEVA ZELANDA": 55,
  "PAISES BAJOS": 56,
  PANAMA: 57,
  PARAGUAY: 58,
  PERU: 59,
  POLONIA: 60,
  PORTUGAL: 61,
  "PUERTO RICO": 62,
  INGLATERRA: 63,
  "REPUBLICA CHECA": 64,
  "REPUBLICA DOMINICANA": 65,
  RUMANIA: 66,
  RUSIA: 67,
  "SANTA SEDE": 68,
  SENEGAL: 69,
  SERBIA: 70,
  SINGAPUR: 71,
  SIRIA: 72,
  SUDAFRICA: 73,
  SUECIA: 74,
  SUIZA: 75,
  SURINAME: 76,
  TAILANDIA: 77,
  TAIWAN: 78,
  TURQUIA: 79,
  UCRANIA: 80,
  URUGUAY: 81,
  VENEZUELA: 82,
  VIETNAM: 83,
};

// Sample addresses for each country - in a full implementation, you might load these from a larger database
const SAMPLE_ADDRESSES: Record<string, string[]> = {
  ALEMANIA: ["Rosenstrasse 84", "Bahnhofstrasse 66", "Hauptstrasse 124"],
  ESPAÑA: ["Calle Mayor 73", "Avenida Central 17", "Calle Real 125"],
  "ESTADOS UNIDOS": ["Main Street 35", "Park Avenue 140", "Lake Road 77"],
  BRASIL: ["Rua Central 92", "Avenida Principal 123", "Rua Comercial 88"],
  IRLANDA: ["Church Avenue 126", "Lake Road 115", "Park Road 123"],
  AUSTRALIA: ["School Road 123", "Main Street 85", "Boulevard Central 22"],
  // Default fallback if country not found
  DEFAULT: ["Street Central 100", "Main Avenue 50", "Central Boulevard 75"],
};

// Define the structure for standardized output
export interface StandardizedData {
  ID: string;
  Vto_ID: string;
  NUMERO_DE_PAIS: number;
  Apellido: string;
  Nombre: string;
  Dirección: string;
  N: string;
  Localidad: string;
  NUMERO_DE_PAIS_2: number;
  Sexo: string;
  Estado_Civil: string;
  Fecha_de_Nacimiento: string;
  Lugar_de_nacimiento: string;
  Profesión: string;
}

/**
 * Standardizes and processes raw passport data
 */
export function processPassportData(data: PassportResult): StandardizedData {
  // Extract and standardize fields
  const country = standardizeCountry(data.nationality || data.country || "");
  const countryCode = getCountryCode(country);
  const birthdate = standardizeDate(data.date_of_birth || "");

  // Extract name components
  const { firstName, lastName } = extractNameComponents(data);

  // Generate a random but plausible address for the country
  const address = getRandomAddress(country);

  // Determine gender/sex formatting
  const gender = standardizeGender(data.sex || "");

  return {
    ID: data.document_id || generateRandomId(),
    Vto_ID: formatExpiryId(data.date_of_expiry || ""),
    NUMERO_DE_PAIS: countryCode,
    Apellido: lastName.toUpperCase(),
    Nombre: firstName.toUpperCase(),
    Dirección: address.street,
    N: address.number,
    Localidad: country,
    NUMERO_DE_PAIS_2: countryCode,
    Sexo: gender,
    Estado_Civil: "SOLTERO", // Default value, could be enhanced with more data
    Fecha_de_Nacimiento: birthdate,
    Lugar_de_nacimiento: country,
    Profesión: "NO INFORMA", // Default value
  };
}

/**
 * Standardizes country names to match the mapping table
 */
function standardizeCountry(country: string): string {
  // Convert to uppercase for consistency
  const upperCountry = country.trim().toUpperCase();

  // Handle common variations
  const countryMap: Record<string, string> = {
    USA: "ESTADOS UNIDOS",
    "UNITED STATES": "ESTADOS UNIDOS",
    US: "ESTADOS UNIDOS",
    UK: "INGLATERRA",
    "UNITED KINGDOM": "INGLATERRA",
    "GREAT BRITAIN": "INGLATERRA",
    GERMANY: "ALEMANIA",
    FRANCE: "FRANCIA",
    SPAIN: "ESPAÑA",
    BRAZIL: "BRASIL",
    IRELAND: "IRLANDA",
    AUSTRALIA: "AUSTRALIA",
    // Add more mappings as needed
  };

  return countryMap[upperCountry] || upperCountry;
}

/**
 * Gets the country code from the standardized country name
 */
function getCountryCode(country: string): number {
  return COUNTRY_CODE_MAP[country] || 0; // Default to 0 if not found
}

/**
 * Standardizes date formats to DD/MM/YYYY
 */
function standardizeDate(dateStr: string): string {
  // Handle common date formats
  if (!dateStr) return "";

  // Try to parse the date, considering various formats
  let date: Date | null = null;

  // Common formats in passport data
  const formats = [
    /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/, // DD/MM/YYYY or DD-MM-YYYY
    /(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/, // YYYY/MM/DD or YYYY-MM-DD
    /(\d{1,2})(\w{3})(\d{2,4})/, // 01JAN1990 format
  ];

  // Try to parse with each format
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format === formats[0]) {
        // DD/MM/YYYY format
        const day = parseInt(match[1]);
        const month = parseInt(match[2]);
        let year = parseInt(match[3]);
        if (year < 100) year += year < 50 ? 2000 : 1900; // Handle 2-digit years
        date = new Date(year, month - 1, day);
      } else if (format === formats[1]) {
        // YYYY/MM/DD format
        const year = parseInt(match[1]);
        const month = parseInt(match[2]);
        const day = parseInt(match[3]);
        date = new Date(year, month - 1, day);
      } else if (format === formats[2]) {
        // 01JAN1990 format
        const day = parseInt(match[1]);
        const monthStr = match[2].toUpperCase();
        let year = parseInt(match[3]);
        if (year < 100) year += year < 50 ? 2000 : 1900;

        const months: Record<string, number> = {
          JAN: 0,
          FEB: 1,
          MAR: 2,
          APR: 3,
          APL: 3,
          MAY: 4,
          JUN: 5,
          JUL: 6,
          AUG: 7,
          SEP: 8,
          OCT: 9,
          NOV: 10,
          DEC: 11,
        };

        const monthIndex = months[monthStr];
        if (monthIndex !== undefined) {
          date = new Date(year, monthIndex, day);
        }
      }
      break;
    }
  }

  // Format the date as DD/MM/YYYY
  if (date && !isNaN(date.getTime())) {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}${month}${year}`;
  }

  // If we couldn't parse the date, return the original string
  return dateStr;
}

/**
 * Extracts first and last name from the passport data
 */
function extractNameComponents(data: PassportResult): {
  firstName: string;
  lastName: string;
} {
  let firstName = data.given_name || "";
  let lastName = data.surname || "";

  // If either is missing, try to extract from full name if available
  if ((!firstName || !lastName) && data.given_name) {
    const nameParts = data.given_name.split(" ");
    if (nameParts.length > 1) {
      lastName = nameParts[0];
      firstName = nameParts.slice(1).join(" ");
    } else {
      firstName = data.given_name;
    }
  }

  return { firstName, lastName };
}

/**
 * Gets a random address for the given country
 */
function getRandomAddress(country: string): { street: string; number: string } {
  const addresses = SAMPLE_ADDRESSES[country] || SAMPLE_ADDRESSES["DEFAULT"];
  const randomIndex = Math.floor(Math.random() * addresses.length);
  const addressParts = addresses[randomIndex].split(" ");

  const number = addressParts.pop() || "";
  const street = addressParts.join(" ");

  return { street, number };
}

/**
 * Standardizes gender information
 */
function standardizeGender(gender: string): string {
  const upperGender = gender.trim().toUpperCase();

  if (
    upperGender === "M" ||
    upperGender === "MALE" ||
    upperGender.includes("MASCULINO")
  ) {
    return "M";
  } else if (
    upperGender === "F" ||
    upperGender === "FEMALE" ||
    upperGender.includes("FEMENINO")
  ) {
    return "F";
  }

  return upperGender || "M"; // Default to M if empty
}

/**
 * Generates a random ID if none is provided
 */
function generateRandomId(): string {
  return Math.floor(Math.random() * 100000000).toString();
}

/**
 * Formats expiry date as an ID
 */
function formatExpiryId(expiryDate: string): string {
  if (!expiryDate) return Math.floor(Math.random() * 10000000).toString();

  // Generate a plausible expiry ID based on the expiry date
  const standardizedDate = standardizeDate(expiryDate);
  if (standardizedDate.length >= 8) {
    return (
      standardizedDate.slice(4) + Math.floor(Math.random() * 10000).toString()
    );
  }

  return Math.floor(Math.random() * 10000000).toString();
}
