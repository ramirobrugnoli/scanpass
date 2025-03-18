// src/utils/excelExport.ts
import { StandardizedData, processPassportData } from "./dataProcessing";
import { PassportResult } from "@/app/types/scan/Iscan";
import {
  enhancePassportDataWithAI,
  processPassportDataLocally,
} from "./openAiService";

/**
 * Generates an Excel file from a single standardized data entry
 */
export function generateExcelFile(data: StandardizedData): File {
  // We'll use CSV as an intermediate format, which can be easily opened in Excel
  const csvContent = generateCSV([data]);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  return new File([blob], "passport_data.csv", { type: "text/csv" });
}

/**
 * Processes raw passport data and then generates an Excel file from multiple entries
 */
export async function generateExcelFileFromMultiple(
  dataEntries: PassportResult[]
): Promise<File> {
  try {
    // Process each passport entry with AI enhancement if available
    const processedEntries: StandardizedData[] = await Promise.all(
      dataEntries.map(async (entry) => {
        let enhancedEntry = entry;

        // Try to enhance with AI if we have the API key configured
        if (process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
          try {
            enhancedEntry = await enhancePassportDataWithAI(entry);
          } catch (error) {
            console.warn(
              "AI enhancement failed, falling back to local processing:",
              error
            );
            enhancedEntry = processPassportDataLocally(entry);
          }
        } else {
          // Fall back to local processing if no API key
          enhancedEntry = processPassportDataLocally(entry);
        }

        // Convert to standardized format
        return processPassportData(enhancedEntry);
      })
    );

    // Generate CSV from processed entries
    const csvContent = generateCSV(processedEntries);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    return new File([blob], "passport_data.csv", { type: "text/csv" });
  } catch (error) {
    console.error("Error processing passport data:", error);
    // Fallback to basic processing without AI
    const basicProcessedEntries = dataEntries.map((entry) =>
      processPassportData(entry)
    );
    const csvContent = generateCSV(basicProcessedEntries);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    return new File([blob], "passport_data_basic.csv", { type: "text/csv" });
  }
}

/**
 * Generates CSV content from the standardized data
 */
function generateCSV(dataEntries: StandardizedData[]): string {
  // Define CSV headers according to the specified format
  const headers = [
    "ID",
    "Vto_ID",
    "NUMERO_DE_PAIS",
    "Apellido",
    "Nombre",
    "Dirección",
    "N°",
    "Localidad",
    "NUMERO_DE_PAIS_2",
    "Sexo",
    "Estado_Civil",
    "Fecha_de_Nacimiento",
    "Lugar_de_nacimiento",
    "Profesión",
  ];

  // Create the CSV header row
  let csvContent = headers.join(",") + "\r\n";

  // Add data rows
  dataEntries.forEach((entry) => {
    const row = [
      entry.ID,
      entry.Vto_ID,
      entry.NUMERO_DE_PAIS,
      `"${entry.Apellido}"`, // Quotes to handle commas in text
      `"${entry.Nombre}"`,
      `"${entry.Dirección}"`,
      entry.N,
      `"${entry.Localidad}"`,
      entry.NUMERO_DE_PAIS_2,
      entry.Sexo,
      `"${entry.Estado_Civil}"`,
      entry.Fecha_de_Nacimiento,
      `"${entry.Lugar_de_nacimiento}"`,
      `"${entry.Profesión}"`,
    ];

    csvContent += row.join(",") + "\r\n";
  });

  return csvContent;
}

/**
 * Triggers download of the Excel file
 */
export function downloadExcelFile(file: File): void {
  // Create a download link
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", file.name);

  // Append to body, click, and remove
  document.body.appendChild(link);
  link.click();

  // Clean up
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}
