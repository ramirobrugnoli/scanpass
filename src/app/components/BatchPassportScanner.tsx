"use client";
// src/app/components/BatchPassportScanner.tsx - componente actualizado
import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { PassportResult } from "../types/scan/Iscan";
import { useImageCompression } from "@/utils/imageCompression";
import { processPassportData, StandardizedData } from "@/utils/dataProcessing";
import {
  generateExcelFileFromMultiple,
  downloadExcelFile,
} from "@/utils/excelExport";

interface ScanStatus {
  file: File;
  status: "pending" | "processing" | "completed" | "error";
  result?: PassportResult;
  processedResult?: StandardizedData;
  error?: string;
  preview?: string;
  compressionStats?: {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
  };
}

// Máximo número de solicitudes concurrentes (aumentado gracias a la optimización)
const MAX_CONCURRENT_REQUESTS = 8;

export default function BatchPassportScanner() {
  const [files, setFiles] = useState<ScanStatus[]>([]);
  const [processing, setProcessing] = useState<boolean>(false);
  const [completed, setCompleted] = useState<number>(0);
  const [failed, setFailed] = useState<number>(0);
  const [exporting, setExporting] = useState<boolean>(false);
  const [totalSaved, setTotalSaved] = useState<number>(0);
  const { compressImage } = useImageCompression();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      status: "pending" as const,
      preview: URL.createObjectURL(file),
    }));

    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png"],
      "application/pdf": [".pdf"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  // Procesar archivos en lotes
  const processFiles = useCallback(async () => {
    if (processing) return;

    setProcessing(true);
    setCompleted(0);
    setFailed(0);
    setTotalSaved(0);

    // Obtener todos los archivos pendientes
    const pendingFiles = files.filter((f) => f.status === "pending");

    if (pendingFiles.length === 0) {
      setProcessing(false);
      return;
    }

    // Procesar archivos en lotes usando un patrón semáforo
    const updateFileStatus = (index: number, updates: Partial<ScanStatus>) => {
      setFiles((prev) =>
        prev.map((file, i) => (i === index ? { ...file, ...updates } : file))
      );
    };

    let activeRequests = 0;
    let fileIndex = 0;
    let totalBytesSaved = 0;

    const processNextFile = async () => {
      if (fileIndex >= pendingFiles.length) return;

      // Encontrar el índice en el array original de archivos
      const originalIndex = files.findIndex(
        (f) => f.file === pendingFiles[fileIndex].file
      );
      fileIndex++;

      if (originalIndex === -1) return processNextFile();

      activeRequests++;
      updateFileStatus(originalIndex, { status: "processing" });

      try {
        // Comprimir la imagen con la función optimizada
        const { compressedFile, stats } = await compressImage(
          files[originalIndex].file,
          true // Indicar que es un pasaporte
        );

        // Actualizar estadísticas de compresión
        updateFileStatus(originalIndex, { compressionStats: stats });

        // Acumular bytes ahorrados
        const bytesSaved = stats.originalSize - stats.compressedSize;
        totalBytesSaved += bytesSaved;
        setTotalSaved(totalBytesSaved);

        // Crear FormData
        const formData = new FormData();
        formData.append("file", compressedFile);

        // Enviar solicitud a la API
        const response = await fetch("/api/scan", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Error al escanear documento");
        }

        const data = await response.json();
        const rawResult = data.data;

        // Procesar los datos a través de nuestro servicio de estandarización
        const processedResult = processPassportData(rawResult);

        updateFileStatus(originalIndex, {
          status: "completed",
          result: rawResult,
          processedResult: processedResult,
        });
        setCompleted((prev) => prev + 1);
      } catch (error) {
        console.error("Error procesando archivo:", error);
        updateFileStatus(originalIndex, {
          status: "error",
          error: error instanceof Error ? error.message : "Error desconocido",
        });
        setFailed((prev) => prev + 1);
      } finally {
        activeRequests--;

        // Si podemos procesar más archivos, hacerlo
        if (activeRequests < MAX_CONCURRENT_REQUESTS) {
          processNextFile();
        }

        // Si no hay más solicitudes activas y no hay más archivos para procesar, hemos terminado
        if (activeRequests === 0 && fileIndex >= pendingFiles.length) {
          setProcessing(false);
        }
      }
    };

    // Iniciar lote inicial de solicitudes
    const initialBatchSize = Math.min(
      MAX_CONCURRENT_REQUESTS,
      pendingFiles.length
    );
    for (let i = 0; i < initialBatchSize; i++) {
      processNextFile();
    }
  }, [files, processing, compressImage]);

  // Limpiar URLs de objetos cuando el componente se desmonta
  useEffect(() => {
    return () => {
      files.forEach((file) => {
        if (file.preview) URL.revokeObjectURL(file.preview);
      });
    };
  }, [files]);

  // Exportar a Excel
  const exportToExcel = useCallback(async () => {
    setExporting(true);

    try {
      // Obtener todos los escaneos completados
      const completedScans = files
        .filter((f) => f.status === "completed" && f.result)
        .map((f) => f.result as PassportResult);

      if (completedScans.length === 0) {
        alert("No hay escaneos completados para exportar");
        return;
      }

      // Mostrar mensaje de proceso
      console.log("Mejorando datos con IA y generando direcciones únicas...");

      // Generar archivo Excel con mejora de IA (incluye direcciones únicas)
      const excelFile = await generateExcelFileFromMultiple(completedScans);
      downloadExcelFile(excelFile);

      console.log(
        "Exportación completada con direcciones únicas generadas para cada persona"
      );
    } catch (error) {
      console.error("Error exportando a Excel:", error);
      alert(
        `Error de exportación: ${
          error instanceof Error ? error.message : "Error desconocido"
        }`
      );
    } finally {
      setExporting(false);
    }
  }, [files]);

  // Formatear bytes para visualización
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">
        Escáner de Pasaportes por Lotes
      </h2>

      {/* Área de carga */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors mb-6 ${
          isDragActive
            ? "border-indigo-500 bg-indigo-50"
            : "border-black-300 hover:border-indigo-300"
        }`}
      >
        <input {...getInputProps()} />
        <div>
          <p className="text-lg">
            Arrastra y suelta imágenes de pasaportes aquí, o haz clic para
            seleccionar
          </p>
          <p className="text-sm text-black-500 mt-2">
            Soporta JPG, PNG, PDF (hasta 10MB cada uno)
          </p>
          <p className="text-sm text-black-500 mt-1">
            {files.length} archivos seleccionados
          </p>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={processFiles}
          disabled={
            processing ||
            files.filter((f) => f.status === "pending").length === 0
          }
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300"
        >
          {processing ? "Procesando..." : "Procesar todos los archivos"}
        </button>

        <button
          onClick={exportToExcel}
          disabled={
            exporting ||
            files.filter((f) => f.status === "completed").length === 0
          }
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300"
        >
          {exporting ? "Exportando..." : "Exportar a Excel"}
        </button>

        <button
          onClick={() => setFiles([])}
          disabled={files.length === 0}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-300"
        >
          Limpiar todo
        </button>
      </div>

      {/* Progreso */}
      {(processing || completed > 0 || failed > 0) && (
        <div className="mb-6 p-4 border rounded-md bg-black-50">
          <h3 className="font-semibold mb-2">Progreso</h3>
          <div className="flex flex-wrap gap-4">
            <div>
              <span className="text-black-600">Total:</span> {files.length}
            </div>
            <div>
              <span className="text-black-600">Pendientes:</span>{" "}
              {files.filter((f) => f.status === "pending").length}
            </div>
            <div>
              <span className="text-black-600">Procesando:</span>{" "}
              {files.filter((f) => f.status === "processing").length}
            </div>
            <div>
              <span className="text-green-600">Completados:</span> {completed}
            </div>
            <div>
              <span className="text-red-600">Fallidos:</span> {failed}
            </div>
            {totalSaved > 0 && (
              <div>
                <span className="text-blue-600">Ahorro de espacio:</span>{" "}
                {formatBytes(totalSaved)} (
                {Math.round(
                  (totalSaved /
                    (totalSaved +
                      files.reduce(
                        (acc, file) =>
                          acc + (file.compressionStats?.compressedSize || 0),
                        0
                      ))) *
                    100
                )}
                %)
              </div>
            )}
          </div>

          {/* Barra de progreso */}
          {files.length > 0 && (
            <div className="w-full bg-black-200 rounded-full h-2.5 mt-2">
              <div
                className="bg-indigo-600 h-2.5 rounded-full"
                style={{
                  width: `${((completed + failed) / files.length) * 100}%`,
                }}
              ></div>
            </div>
          )}
        </div>
      )}

      {/* Lista de archivos */}
      {files.length > 0 && (
        <div className="border rounded-md overflow-hidden">
          <table className="min-w-full divide-y divide-black-200">
            <thead className="bg-black-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-black-500 uppercase tracking-wider">
                  Vista previa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black-500 uppercase tracking-wider">
                  Nombre de archivo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black-500 uppercase tracking-wider">
                  Compresión
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black-500 uppercase tracking-wider">
                  Datos procesados
                </th>
              </tr>
            </thead>
            <tbody className="bg-black divide-y divide-white-200">
              {files.map((file, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {file.preview && (
                      <div className="h-16 w-24 relative">
                        <Image
                          src={file.preview}
                          alt="Vista previa"
                          fill
                          className="object-contain"
                        />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-black-900">
                      {file.file.name}
                    </div>
                    <div className="text-xs text-black-500">
                      {(file.file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${
                        file.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : ""
                      }
                      ${
                        file.status === "processing"
                          ? "bg-blue-100 text-blue-800"
                          : ""
                      }
                      ${
                        file.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : ""
                      }
                      ${
                        file.status === "error" ? "bg-red-100 text-red-800" : ""
                      }
                    `}
                    >
                      {file.status.charAt(0).toUpperCase() +
                        file.status.slice(1)}
                    </span>
                    {file.error && (
                      <div className="text-xs text-red-500 mt-1">
                        {file.error}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {file.compressionStats ? (
                      <div className="text-xs">
                        <div>
                          Original:{" "}
                          {formatBytes(file.compressionStats.originalSize)}
                        </div>
                        <div>
                          Comprimido:{" "}
                          {formatBytes(file.compressionStats.compressedSize)}
                        </div>
                        <div className="font-semibold text-green-600">
                          Ratio:{" "}
                          {file.compressionStats.compressionRatio.toFixed(1)}x
                        </div>
                        <div>
                          Ahorro:{" "}
                          {formatBytes(
                            file.compressionStats.originalSize -
                              file.compressionStats.compressedSize
                          )}
                          (
                          {Math.round(
                            (1 -
                              file.compressionStats.compressedSize /
                                file.compressionStats.originalSize) *
                              100
                          )}
                          %)
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">
                        No procesado
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {file.status === "completed" && file.processedResult && (
                      <details className="text-xs">
                        <summary className="cursor-pointer font-medium text-indigo-600">
                          Ver datos procesados
                        </summary>
                        <div className="mt-2 max-h-40 overflow-y-auto">
                          {/* Mostrar todos los campos */}
                          {Object.entries(file.processedResult).map(
                            ([key, value]) => (
                              <div key={key} className="mb-1">
                                <span className="font-medium">{key}:</span>{" "}
                                {value?.toString() || ""}
                              </div>
                            )
                          )}
                        </div>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
