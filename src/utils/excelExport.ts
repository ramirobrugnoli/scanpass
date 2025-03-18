// src/utils/excelExport.ts
import { StandardizedData } from "./dataProcessing";

/**
 * Generates an Excel file from the standardized data
 */
export function generateExcelFile(data: StandardizedData): File {
  // We'll use CSV as an intermediate format, which can be easily opened in Excel
  const csvContent = generateCSV([data]);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  return new File([blob], "passport_data.csv", { type: "text/csv" });
}

/**
 * Generates an Excel file from multiple standardized data entries
 */
export function generateExcelFileFromMultiple(
  dataEntries: StandardizedData[]
): File {
  const csvContent = generateCSV(dataEntries);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  return new File([blob], "passport_data.csv", { type: "text/csv" });
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
