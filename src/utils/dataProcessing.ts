// src/utils/dataProcessing.ts
import { PassportResult } from "@/app/types/scan/Iscan";

// Define the mapping table from country to country code
export const COUNTRY_CODE_MAP: Record<string, number> = {
  ALEMANIA: 0,
  DEUTSCH: 0,
  ARGENTINA: 1,
  ARMENIA: 1,
  AUSTRALIA: 2,
  AUSTRIA: 3,
  BELGICA: 4,
  BÉLGICA: 4,
  BOLIVIA: 5,
  BRASIL: 6,
  BULGARIA: 7,
  CANADA: 8,
  CHILE: 9,
  CHINA: 10,
  COLOMBIA: 11,
  COLOMBIANA: 11,
  CONGO: 12,
  "COREA DEMOCRATICA": 13,
  "COREA REPUBLICANA": 14,
  "COSTA RICA": 15,
  CROACIA: 16,
  CUBA: 17,
  DINAMARCA: 18,
  ECUADOR: 19,
  ECU: 19,
  EGIPTO: 20,
  "EL SALVADOR": 21,
  ESLOVAQUIA: 22,
  ESLOVENIA: 23,
  ESPAÑA: 24,
  "ESTADOS UNIDOS": 25,
  USA: 25,
  "U.S.A.": 25,
  "U.S.A": 25,
  "EE.UU.": 25,
  "UNITED STATES": 25,
  "UNITED STATES OF AMERICA": 25,
  "UNITED STATES OF AMER": 25,
  "UNITED STATES OF AME": 25,
  FILIPINAS: 26,
  FINLANDIA: 27,
  FRANCIA: 28,
  FRANÇAISE: 28,
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
  "REINO UNIDO": 63,
  "REPUBLICA CHECA": 64,
  "REPUBLICA DOMINICANA": 65,
  "REPÚBLICA DOMINICANA": 65,
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

export interface StandardizedData {
  ID: string;
  Vto_ID: string;
  NUMERO_DE_PAIS: number | string;
  Apellido: string;
  Nombre: string;
  Dirección: string;
  N: string;
  Localidad: string;
  NUMERO_DE_PAIS_2: number | string;
  Sexo: string;
  Estado_Civil: string;
  Fecha_de_Nacimiento: string;
  Lugar_de_nacimiento: string;
  Profesión: string;
}

/**
 * Standardizes and processes raw passport data
 */
export function processPassportData(
  data: PassportResult & {
    street_address?: string;
    address_number?: string;
    address_locality?: string;
  }
): StandardizedData {
  // Extraer y estandarizar campos
  const country = standardizeCountry(data.place_of_birth);
  const country2 = standardizeCountry(data.nationality || data.country || "");

  const countryCode = getCountryCode(country);
  const countryCode2 = getCountryCode(country2);

  const birthdate = standardizeDate(data.date_of_birth || "");

  // Extraer componentes del nombre
  const { firstName, lastName } = extractNameComponents(data);

  // Determinar género/sexo
  const gender = standardizeGender(data.sex || "");

  // Usar dirección generada por IA si está disponible, o generar una única
  let address;
  let locality;

  console.log("data en processPassportData:", data);

  if (data.street_address) {
    // Usar dirección proporcionada por la API
    address = {
      street: data.street_address,
      number: data.address_number || generateRandomNumber(1, 150).toString(),
    };
    locality = data.address_locality || country;
  } else {
    // Generar una dirección única para esta person
    address = {
      street: "fallo adress",
      number: "fallo adress",
    };
    locality = "fallo adress";
  }

  return {
    ID: data.document_id,
    Vto_ID: formatExpiryId(data.date_of_expiry || ""),
    NUMERO_DE_PAIS: countryCode,
    Apellido: lastName.toUpperCase(),
    Nombre: firstName.toUpperCase(),
    Dirección: address.street,
    N: address.number,
    Localidad: locality,
    NUMERO_DE_PAIS_2: countryCode2,
    Sexo: gender,
    Estado_Civil: "SOLTERO", // Valor predeterminado
    Fecha_de_Nacimiento: birthdate,
    Lugar_de_nacimiento: data.place_of_birth || country,
    Profesión: "NO INFORMA", // Valor predeterminado
  };
}

/**
 * Standardizes country names to match the mapping table
 */
function standardizeCountry(country: string): string {
  if (!country) return "";

  // Convert to uppercase for consistency
  const upperCountry = country.trim().toUpperCase();

  // Handle common variations
  const countryMap: Record<string, string> = {
    // Existentes en el archivo original
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
    "UNITED STATES OF AMERICA": "ESTADOS UNIDOS",
    URUGUAYA: "URUGUAY",
    NETHERLANDS: "PAISES BAJOS",
    BRITISH: "INGLATERRA",
    FRANÇAISE: "FRANCIA",
    DEUTSCH: "ALEMANIA",
    ESPAÑOLA: "ESPAÑA",
    ECUATORIANA: "ECUADOR",
    ITALIANA: "ITALIA",
    ISRAELI: "ISRAEL",
    COLOMBIANA: "COLOMBIA",
    ARGENTINA: "ARGENTINA",
    ARGENTINO: "ARGENTINA",
    ARGENTINIAN: "ARGENTINA",
    "MAGYAR/HUNGARIAN": "HUNGRIA",
    HUNGARIAN: "HUNGRIA",
    HUNGARY: "HUNGRIA",
    BEL: "BELGICA",
    BELGIAN: "BELGICA",
    "ECUATORIANA/ECUADORIAN": "ECUADOR",
    ECUADORIAN: "ECUADOR",
    ECUATOR: "ECUADOR",
    BRITÁNICO: "INGLATERRA",
    BRITÁNICA: "INGLATERRA",
    PORTUGUESA: "PORTUGAL",
    "NORSK/NORUEGO": "NORUEGA",
    FRANCAISE: "FRANCIA",
    FRANCESA: "FRANCIA",
    ALEMAN: "ALEMANIA",
    PARAGUAYA: "PARAGUAY",
    MEXICANA: "MEXICO",
    "ÉIREANNACH/IRISH": "IRLANDA",
    ÉIREANNACH: "IRLANDA",
    IRISH: "IRLANDA",
    ECU: "ECUADOR",
    AUSTRIAN: "AUSTRIA",
    "BRASILEIRO(A)": "BRASIL",
    BRASILEIRO: "BRASIL",
    BRASILEIRA: "BRASIL",
    ALEMANIA: "ALEMANIA",

    // Gentilicios en español - Masculino
    ALEMÁN: "ALEMANIA",
    AMERICANO: "ESTADOS UNIDOS",
    AUSTRALIANO: "AUSTRALIA",
    AUSTRIACO: "AUSTRIA",
    BELGA: "BELGICA",
    BOLIVIANO: "BOLIVIA",
    BRASILEÑO: "BRASIL",
    BRASILENO: "BRASIL",
    CANADIENSE: "CANADA",
    CHILENO: "CHILE",
    CHINO: "CHINA",
    COLOMBIANO: "COLOMBIA",
    COSTARRICENSE: "COSTA RICA",
    CUBANO: "CUBA",
    DANES: "DINAMARCA",
    DANÉS: "DINAMARCA",
    DOMINICANO: "REPUBLICA DOMINICANA",
    ECUATORIANO: "ECUADOR",
    EGIPCIO: "EGIPTO",
    ESPAÑOL: "ESPAÑA",
    ESPANOL: "ESPAÑA",
    ESTADOUNIDENSE: "ESTADOS UNIDOS",
    FILIPINO: "FILIPINAS",
    FINLANDES: "FINLANDIA",
    FINLANDÉS: "FINLANDIA",
    FRANCES: "FRANCIA",
    FRANCÉS: "FRANCIA",
    GRIEGO: "GRECIA",
    GUATEMALTECO: "GUATEMALA",
    HAITIANO: "HAITI",
    HOLANDES: "PAISES BAJOS",
    HOLANDÉS: "PAISES BAJOS",
    HONDUREÑO: "HONDURAS",
    HONDURENO: "HONDURAS",
    HUNGARO: "HUNGRIA",
    HÚNGARO: "HUNGRIA",
    INDIO: "INDIA",
    INDONESIO: "INDONESIA",
    IRLANDES: "IRLANDA",
    IRLANDÉS: "IRLANDA",
    ISRAELÍ: "ISRAEL",
    ITALIANO: "ITALIA",
    JAPONES: "JAPON",
    JAPONÉS: "JAPON",
    LIBANES: "LIBANO",
    LIBANÉS: "LIBANO",
    LUXEMBURGUES: "LUXEMBURGO",
    LUXEMBURGUÉS: "LUXEMBURGO",
    MARROQUI: "MARRUECOS",
    MARROQUÍ: "MARRUECOS",
    MEXICANO: "MEXICO",
    NICARAGUENSE: "NICARAGUA",
    NICARAGÜENSE: "NICARAGUA",
    NORUEGO: "NORUEGA",
    NEOZELANDES: "NUEVA ZELANDA",
    NEOZELANDÉS: "NUEVA ZELANDA",
    PANAMEÑO: "PANAMA",
    PANAMENO: "PANAMA",
    PARAGUAYO: "PARAGUAY",
    PERUANO: "PERU",
    POLACO: "POLONIA",
    PORTUGUES: "PORTUGAL",
    PORTUGUÉS: "PORTUGAL",
    PUERTORRIQUEÑO: "PUERTO RICO",
    PUERTORRIQUENO: "PUERTO RICO",
    RUMANO: "RUMANIA",
    RUSO: "RUSIA",
    SALVADOREÑO: "EL SALVADOR",
    SALVADORENO: "EL SALVADOR",
    SENEGALES: "SENEGAL",
    SENEGALÉS: "SENEGAL",
    SERBIO: "SERBIA",
    SINGAPURENSE: "SINGAPUR",
    SIRIO: "SIRIA",
    SUDAFRICANO: "SUDAFRICA",
    SUECO: "SUECIA",
    SUIZO: "SUIZA",
    TAILANDES: "TAILANDIA",
    TAILANDÉS: "TAILANDIA",
    TAIWANES: "TAIWAN",
    TAIWANÉS: "TAIWAN",
    TURCO: "TURQUIA",
    UCRANIANO: "UCRANIA",
    URUGUAYO: "URUGUAY",
    VENEZOLANO: "VENEZUELA",
    VIETNAMITA: "VIETNAM",

    // Gentilicios en español - Femenino
    ALEMANA: "ALEMANIA",
    AMERICANA: "ESTADOS UNIDOS",
    AUSTRALIANA: "AUSTRALIA",
    AUSTRIACA: "AUSTRIA",
    BOLIVIANA: "BOLIVIA",
    BRASILEÑA: "BRASIL",
    BRASILENA: "BRASIL",
    BRITANICA: "INGLATERRA",
    CHILENA: "CHILE",
    CHINA: "CHINA",
    CUBANA: "CUBA",
    DANESA: "DINAMARCA",
    DOMINICANA: "REPUBLICA DOMINICANA",
    EGIPCIA: "EGIPTO",
    ESPANOLA: "ESPAÑA",
    FILIPINA: "FILIPINAS",
    FINLANDESA: "FINLANDIA",
    GRIEGA: "GRECIA",
    GUATEMALTECA: "GUATEMALA",
    HAITIANA: "HAITI",
    HOLANDESA: "PAISES BAJOS",
    HONDUREÑA: "HONDURAS",
    HONDURENA: "HONDURAS",
    HUNGARA: "HUNGRIA",
    HÚNGARA: "HUNGRIA",
    INDIA: "INDIA",
    INDONESIA: "INDONESIA",
    IRLANDESA: "IRLANDA",
    JAPONESA: "JAPON",
    LIBANESA: "LIBANO",
    LUXEMBURGUESA: "LUXEMBURGO",
    NORUEGA: "NORUEGA",
    NEOZELANDESA: "NUEVA ZELANDA",
    PANAMEÑA: "PANAMA",
    PANAMENA: "PANAMA",
    PERUANA: "PERU",
    POLACA: "POLONIA",
    PUERTORRIQUEÑA: "PUERTO RICO",
    PUERTORRIQUENA: "PUERTO RICO",
    RUMANA: "RUMANIA",
    RUSA: "RUSIA",
    SALVADOREÑA: "EL SALVADOR",
    SALVADORENA: "EL SALVADOR",
    SERBIA: "SERBIA",
    SIRIA: "SIRIA",
    SUDAFRICANA: "SUDAFRICA",
    SUECA: "SUECIA",
    SUIZA: "SUIZA",
    TAILANDESA: "TAILANDIA",
    TAIWANESA: "TAIWAN",
    TURCA: "TURQUIA",
    UCRANIANA: "UCRANIA",
    VENEZOLANA: "VENEZUELA",

    // Gentilicios en inglés
    AMERICAN: "ESTADOS UNIDOS",
    ARGENTINEAN: "ARGENTINA",
    AUSTRALIAN: "AUSTRALIA",
    BOLIVIAN: "BOLIVIA",
    BRAZILIAN: "BRASIL",
    CANADIAN: "CANADA",
    CHILEAN: "CHILE",
    CHINESE: "CHINA",
    COLOMBIAN: "COLOMBIA",
    "COSTA RICAN": "COSTA RICA",
    CUBAN: "CUBA",
    DANISH: "DINAMARCA",
    DOMINICAN: "REPUBLICA DOMINICANA",
    DUTCH: "PAISES BAJOS",
    EGYPTIAN: "EGIPTO",
    ENGLISH: "INGLATERRA",
    FINNISH: "FINLANDIA",
    FRENCH: "FRANCIA",
    GERMAN: "ALEMANIA",
    GREEK: "GRECIA",
    GUATEMALAN: "GUATEMALA",
    HAITIAN: "HAITI",
    ICELANDIC: "ISLANDIA",
    INDIAN: "INDIA",
    INDONESIAN: "INDONESIA",
    ITALIAN: "ITALIA",
    JAPANESE: "JAPON",
    LEBANESE: "LIBANO",
    LUXEMBOURGISH: "LUXEMBURGO",
    MEXICAN: "MEXICO",
    MOROCCAN: "MARRUECOS",
    NICARAGUAN: "NICARAGUA",
    NORWEGIAN: "NORUEGA",
    "NEW ZEALANDER": "NUEVA ZELANDA",
    PANAMANIAN: "PANAMA",
    PARAGUAYAN: "PARAGUAY",
    PERUVIAN: "PERU",
    POLISH: "POLONIA",
    PORTUGUESE: "PORTUGAL",
    "PUERTO RICAN": "PUERTO RICO",
    ROMANIAN: "RUMANIA",
    RUSSIAN: "RUSIA",
    SALVADORAN: "EL SALVADOR",
    SENEGALESE: "SENEGAL",
    SERBIAN: "SERBIA",
    SINGAPOREAN: "SINGAPUR",
    SPANISH: "ESPAÑA",
    SWEDISH: "SUECIA",
    SWISS: "SUIZA",
    TAIWANESE: "TAIWAN",
    THAI: "TAILANDIA",
    TURKISH: "TURQUIA",
    UKRAINIAN: "UCRANIA",
    URUGUAYAN: "URUGUAY",
    VENEZUELAN: "VENEZUELA",
    VIETNAMESE: "VIETNAM",

    // Códigos y abreviaturas
    ARG: "ARGENTINA",
    AUS: "AUSTRALIA",
    AUT: "AUSTRIA",
    BOL: "BOLIVIA",
    BRA: "BRASIL",
    CAN: "CANADA",
    CHE: "SUIZA",
    CHL: "CHILE",
    CHN: "CHINA",
    COL: "COLOMBIA",
    CRI: "COSTA RICA",
    CUB: "CUBA",
    DEU: "ALEMANIA",
    DNK: "DINAMARCA",
    DOM: "REPUBLICA DOMINICANA",
    EGY: "EGIPTO",
    ESP: "ESPAÑA",
    FIN: "FINLANDIA",
    FRA: "FRANCIA",
    GBR: "INGLATERRA",
    GRC: "GRECIA",
    GTM: "GUATEMALA",
    HTI: "HAITI",
    HUN: "HUNGRIA",
    IND: "INDIA",
    IDN: "INDONESIA",
    IRL: "IRLANDA",
    ISL: "ISLANDIA",
    ISR: "ISRAEL",
    ITA: "ITALIA",
    JPN: "JAPON",
    LBN: "LIBANO",
    LUX: "LUXEMBURGO",
    MEX: "MEXICO",
    MAR: "MARRUECOS",
    NIC: "NICARAGUA",
    NLD: "PAISES BAJOS",
    NOR: "NORUEGA",
    NZL: "NUEVA ZELANDA",
    PAN: "PANAMA",
    PER: "PERU",
    POL: "POLONIA",
    PRT: "PORTUGAL",
    PRY: "PARAGUAY",
    ROU: "RUMANIA",
    RUS: "RUSIA",
    SLV: "EL SALVADOR",
    SEN: "SENEGAL",
    SRB: "SERBIA",
    SGP: "SINGAPUR",
    SYR: "SIRIA",
    SWE: "SUECIA",
    THA: "TAILANDIA",
    TWN: "TAIWAN",
    TUR: "TURQUIA",
    UKR: "UCRANIA",
    URY: "URUGUAY",
    VEN: "VENEZUELA",
    VNM: "VIETNAM",
    ZAF: "SUDAFRICA",

    // Formatos compuestos y variantes adicionales
    "REPÚBLICA ARGENTINA": "ARGENTINA",
    "REPUBLICA ARGENTINA": "ARGENTINA",
    "REPUBLIC OF ARGENTINA": "ARGENTINA",
    "RÉPUBLIQUE FRANÇAISE": "FRANCIA",
    "REPUBLIQUE FRANCAISE": "FRANCIA",
    "REPUBLIK ÖSTERREICH": "AUSTRIA",
    "REPUBLIK OSTERREICH": "AUSTRIA",
    "BUNDESREPUBLIK DEUTSCHLAND": "ALEMANIA",
    "FEDERAL REPUBLIC OF GERMANY": "ALEMANIA",
    "REPÚBLICA DE COLOMBIA": "COLOMBIA",
    "REPUBLICA DE COLOMBIA": "COLOMBIA",
    "REPUBLIC OF COLOMBIA": "COLOMBIA",
    "REPÚBLICA DEL PERÚ": "PERU",
    "REPUBLICA DEL PERU": "PERU",
    "REPUBLIC OF PERU": "PERU",
    "RÉPUBLIQUE D'HAÏTI": "HAITI",
    "REPUBLIQUE D'HAITI": "HAITI",
    "REPUBLIC OF HAITI": "HAITI",
    "KINGDOM OF SPAIN": "ESPAÑA",
    "REINO DE ESPAÑA": "ESPAÑA",
    "REINO DE ESPANA": "ESPAÑA",
    "RÉPUBLIQUE DU SÉNÉGAL": "SENEGAL",
    "REPUBLIQUE DU SENEGAL": "SENEGAL",
    "REPUBLIC OF SENEGAL": "SENEGAL",

    // Nombres específicos y variantes
    "REPÚBLICA ORIENTAL DEL URUGUAY": "URUGUAY",
    "REPUBLICA ORIENTAL DEL URUGUAY": "URUGUAY",
    "REP. ORIENTAL DEL URUGUAY": "URUGUAY",
    "ORIENTAL REPUBLIC OF URUGUAY": "URUGUAY",
    "REPÚBLICA BOLIVARIANA DE VENEZUELA": "VENEZUELA",
    "REPUBLICA BOLIVARIANA DE VENEZUELA": "VENEZUELA",
    "BOLIVARIAN REPUBLIC OF VENEZUELA": "VENEZUELA",
    "ESTADO PLURINACIONAL DE BOLIVIA": "BOLIVIA",
    "PLURINATIONAL STATE OF BOLIVIA": "BOLIVIA",
    "UNITED MEXICAN STATES": "MEXICO",
    "ESTADOS UNIDOS MEXICANOS": "MEXICO",
    "COMMONWEALTH OF AUSTRALIA": "AUSTRALIA",
    "SWISS CONFEDERATION": "SUIZA",
    "CONFEDERACIÓN SUIZA": "SUIZA",
    "CONFEDERACION SUIZA": "SUIZA",
    "FEDERATION OF MALAYSIA": "MALASIA",
    "FEDERACIÓN DE MALASIA": "MALASIA",
    "FEDERACION DE MALASIA": "MALASIA",
    "REPUBLIC OF SINGAPORE": "SINGAPUR",
    "REPÚBLICA DE SINGAPUR": "SINGAPUR",
    "REPUBLICA DE SINGAPUR": "SINGAPUR",
    "REPUBLIC OF SOUTH AFRICA": "SUDAFRICA",
    "REPÚBLICA DE SUDÁFRICA": "SUDAFRICA",
    "REPUBLICA DE SUDAFRICA": "SUDAFRICA",
    "REPUBLIC OF KENYA": "KENYA",
    "REPÚBLICA DE KENIA": "KENYA",
    "REPUBLICA DE KENIA": "KENYA",
    "CZECH REPUBLIC": "REPUBLICA CHECA",
    "REPÚBLICA CHECA": "REPUBLICA CHECA",
    "STATE OF ISRAEL": "ISRAEL",
    "ESTADO DE ISRAEL": "ISRAEL",
    "REPUBLIC OF INDONESIA": "INDONESIA",
    "REPÚBLICA DE INDONESIA": "INDONESIA",
    "REPUBLICA DE INDONESIA": "INDONESIA",
    "REPUBLIC OF INDIA": "INDIA",
    "REPÚBLICA DE LA INDIA": "INDIA",
    "REPUBLICA DE LA INDIA": "INDIA",
    "REPUBLIC OF THE PHILIPPINES": "FILIPINAS",
    "REPÚBLICA DE FILIPINAS": "FILIPINAS",
    "REPUBLICA DE FILIPINAS": "FILIPINAS",
    "REPUBLIC OF CUBA": "CUBA",
    "REPÚBLICA DE CUBA": "CUBA",
    "REPUBLICA DE CUBA": "CUBA",
    "FEDERATIVE REPUBLIC OF BRAZIL": "BRASIL",
    "REPÚBLICA FEDERATIVA DE BRASIL": "BRASIL",
    "REPUBLICA FEDERATIVA DE BRASIL": "BRASIL",
    "REPUBLIC OF AUSTRIA": "AUSTRIA",
    "REPÚBLICA DE AUSTRIA": "AUSTRIA",
    "REPUBLICA DE AUSTRIA": "AUSTRIA",
    "REPUBLIC OF TURKEY": "TURQUIA",
    "REPÚBLICA DE TURQUÍA": "TURQUIA",
    "REPUBLICA DE TURQUIA": "TURQUIA",
    "REPUBLIC OF CHILE": "CHILE",
    "REPÚBLICA DE CHILE": "CHILE",
    "REPUBLICA DE CHILE": "CHILE",
    "HELLENIC REPUBLIC": "GRECIA",
    "REPÚBLICA HELÉNICA": "GRECIA",
    "REPUBLICA HELENICA": "GRECIA",
    // Variantes problematicas del Excel proporcionado
    "ECUATORIANA/ECUATORIANO": "ECUADOR",
    BRITANICO: "INGLATERRA",
  };

  return countryMap[upperCountry] || upperCountry;
}

/**
 * Gets the country code from the standardized country name
 */
function getCountryCode(country: string): number | string {
  console.log("vamos a llamar a country code map con country:", country);
  return COUNTRY_CODE_MAP[country] || country;
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

  // Si falta alguno, intentar extraer del nombre completo si está disponible
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

function generateRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
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
