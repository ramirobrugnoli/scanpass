// src/utils/excelExport.ts
import { StandardizedData, processPassportData } from "./dataProcessing";
import { PassportResult } from "@/app/types/scan/Iscan";
import {
  enhancePassportDataWithAI,
  processPassportDataLocally,
} from "./openAiService";
import * as XLSX from "xlsx";

/**
 * Generates an Excel file from a single standardized data entry
 */
export function generateExcelFile(data: StandardizedData): File {
  return generateExcelFileXLSX([data]);
}

/**
 * Processes raw passport data and then generates an Excel file from multiple entries
 */
export async function generateExcelFileFromMultiple(
  dataEntries: PassportResult[]
): Promise<File> {
  try {
    // Process each passport entry with AI enhancement
    const processedEntries: StandardizedData[] = await Promise.all(
      dataEntries.map(async (entry) => {
        let enhancedEntry = entry;

        try {
          // Try to enhance with AI via our server API
          enhancedEntry = await enhancePassportDataWithAI(entry);
        } catch (error) {
          console.warn(
            "AI enhancement failed, falling back to local processing:",
            error
          );
          enhancedEntry = processPassportDataLocally(entry);
        }

        // Convert to standardized format
        return processPassportData(enhancedEntry);
      })
    );

    // Generate XLSX from processed entries
    return generateExcelFileXLSX(processedEntries);
  } catch (error) {
    console.error("Error processing passport data:", error);
    // Fallback to basic processing without AI
    const basicProcessedEntries = dataEntries.map((entry) =>
      processPassportData(entry)
    );
    return generateExcelFileXLSX(basicProcessedEntries);
  }
}

/**
 * Generates an XLSX file from standardized data
 */
function generateExcelFileXLSX(dataEntries: StandardizedData[]): File {
  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();

  // Define headers with spaces between words (as shown in the screenshot)
  const headers = [
    "ID",
    "Vto. ID",
    "NUMERO DE PAIS",
    "Apellido",
    "Nombre",
    "Dirección",
    "N°",
    "Localidad",
    "NUMERO DE PAIS 2",
    "Sexo",
    "Estado Civil",
    "Fecha de Nacimiento",
    "Lugar de nacimiento",
    "Profesión",
  ];

  // Create array of data with headers as the first row
  const data = [
    headers,
    ...dataEntries.map((entry) => [
      entry.ID,
      entry.Vto_ID,
      entry.NUMERO_DE_PAIS,
      entry.Apellido,
      entry.Nombre,
      entry.Dirección,
      entry.N,
      entry.Localidad,
      entry.NUMERO_DE_PAIS_2,
      entry.Sexo,
      entry.Estado_Civil,
      entry.Fecha_de_Nacimiento,
      entry.Lugar_de_nacimiento,
      entry.Profesión,
    ]),
  ];

  // Create worksheet from data
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Set column widths (adjust as needed to match your desired format)
  const colWidths = [
    { wch: 10 }, // ID
    { wch: 10 }, // Vto. ID
    { wch: 15 }, // NUMERO DE PAIS
    { wch: 20 }, // Apellido
    { wch: 20 }, // Nombre
    { wch: 25 }, // Dirección
    { wch: 5 }, // N°
    { wch: 15 }, // Localidad
    { wch: 15 }, // NUMERO DE PAIS 2
    { wch: 5 }, // Sexo
    { wch: 12 }, // Estado Civil
    { wch: 19 }, // Fecha de Nacimiento
    { wch: 20 }, // Lugar de nacimiento
    { wch: 15 }, // Profesión
  ];

  worksheet["!cols"] = colWidths;

  // Apply formatting to header row (bold and filled background)
  const headerRange = XLSX.utils.decode_range(worksheet["!ref"] || "A1:N1");

  // Create header style (bold text with border)
  const headerStyle = {
    font: { bold: true },
    fill: { fgColor: { rgb: "EFEFEF" } }, // Light gray background
    border: {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    },
    alignment: { horizontal: "center" },
  };

  // Apply styles to header cells
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!worksheet[cellAddress]) worksheet[cellAddress] = { t: "s", v: "" };
    worksheet[cellAddress].s = headerStyle;
  }

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, "Passport Data");

  // Generate XLSX file
  const excelBuffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  return new File([blob], "passport_data.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
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
