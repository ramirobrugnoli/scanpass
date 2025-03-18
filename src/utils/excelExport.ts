// src/utils/excelExport.ts
import { StandardizedData, processPassportData } from "./dataProcessing";
import { PassportResult } from "@/app/types/scan/Iscan";
import { enhancePassportDataWithAI, isOpenAIConfigured } from "./openAiService";

/**
 * Genera un archivo Excel a partir de los datos estandarizados
 */
export function generateExcelFile(data: StandardizedData): File {
  // Usamos CSV como formato intermedio, que puede abrirse fácilmente en Excel
  const csvContent = generateCSV([data]);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  return new File([blob], "passport_data.csv", { type: "text/csv" });
}

/**
 * Genera un archivo Excel a partir de múltiples entradas de datos estandarizados
 */
export async function generateExcelFileFromMultiple(
  rawDataEntries: PassportResult[]
): Promise<File> {
  try {
    // Verificar si se puede usar IA para mejorar los datos
    let processedEntries: StandardizedData[];
    const useAI = isOpenAIConfigured();

    if (useAI && rawDataEntries.length > 0) {
      console.log("Procesando datos con OpenAI...");
      // Procesar todos los datos en una sola llamada a la API
      processedEntries = await enhancePassportDataWithAI(rawDataEntries);
    } else {
      console.log("Procesando datos sin OpenAI...");
      // Usar el procesamiento estándar sin IA
      processedEntries = rawDataEntries.map((entry) =>
        processPassportData(entry)
      );
    }

    const csvContent = generateCSV(processedEntries);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    return new File([blob], "passport_data.csv", { type: "text/csv" });
  } catch (error) {
    console.error("Error al generar archivo Excel:", error);
    // En caso de error, usar el método estándar sin IA
    const processedEntries = rawDataEntries.map((entry) =>
      processPassportData(entry)
    );
    const csvContent = generateCSV(processedEntries);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    return new File([blob], "passport_data.csv", { type: "text/csv" });
  }
}

/**
 * Genera contenido CSV a partir de los datos estandarizados
 */
function generateCSV(dataEntries: StandardizedData[]): string {
  // Definir encabezados CSV según el formato especificado
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

  // Crear la fila de encabezado CSV
  let csvContent = headers.join(",") + "\r\n";

  // Agregar filas de datos
  dataEntries.forEach((entry) => {
    const row = [
      entry.ID,
      entry.Vto_ID,
      entry.NUMERO_DE_PAIS,
      `"${entry.Apellido}"`, // Comillas para manejar comas en el texto
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
 * Descarga el archivo Excel
 */
export function downloadExcelFile(file: File): void {
  // Crear un enlace de descarga
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", file.name);

  // Agregar al cuerpo, hacer clic y eliminar
  document.body.appendChild(link);
  link.click();

  // Limpiar
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}
