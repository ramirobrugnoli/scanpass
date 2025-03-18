// src/app/components/BatchPassportScanner.tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { PassportResult } from "../types/scan/Iscan";
import { useImageCompression } from "@/utils/imageCompression";
import { StandardizedData } from "@/utils/dataProcessing";
import {
  generateExcelFileFromMultiple,
  downloadExcelFile,
} from "@/utils/excelExport";
import { isOpenAIConfigured } from "@/utils/openAiService";

interface ScanStatus {
  file: File;
  status: "pending" | "processing" | "completed" | "error";
  result?: PassportResult;
  processedResult?: StandardizedData;
  error?: string;
  preview?: string;
}

// Número máximo de solicitudes concurrentes
const MAX_CONCURRENT_REQUESTS = 5;

export default function BatchPassportScanner() {
  const [files, setFiles] = useState<ScanStatus[]>([]);
  const [processing, setProcessing] = useState<boolean>(false);
  const [completed, setCompleted] = useState<number>(0);
  const [failed, setFailed] = useState<number>(0);
  const [aiEnabled, setAiEnabled] = useState<boolean>(false);
  const [exportLoading, setExportLoading] = useState<boolean>(false);
  const { compressImage } = useImageCompression();

  // Verificar si OpenAI está configurado
  useEffect(() => {
    setAiEnabled(isOpenAIConfigured());
  }, []);

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

    // Obtener todos los archivos pendientes
    const pendingFiles = files.filter((f) => f.status === "pending");

    if (pendingFiles.length === 0) {
      setProcessing(false);
      return;
    }

    // Procesar archivos en lotes utilizando un patrón de semáforo
    const updateFileStatus = (index: number, updates: Partial<ScanStatus>) => {
      setFiles((prev) =>
        prev.map((file, i) => (i === index ? { ...file, ...updates } : file))
      );
    };

    let activeRequests = 0;
    let fileIndex = 0;

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
        // Comprimir la imagen (si es una imagen)
        const compressedFile = await compressImage(files[originalIndex].file);

        // Crear form data
        const formData = new FormData();
        formData.append("file", compressedFile);

        // Enviar solicitud a la API
        const response = await fetch("/api/scan", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Error escaneando documento");
        }

        const data = await response.json();
        const rawResult = data.data;

        updateFileStatus(originalIndex, {
          status: "completed",
          result: rawResult,
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

  // Limpiar URLs de objetos al desmontar el componente
  useEffect(() => {
    return () => {
      files.forEach((file) => {
        if (file.preview) URL.revokeObjectURL(file.preview);
      });
    };
  }, [files]);

  // Exportar a CSV (funcionalidad existente)
  const exportToCSV = useCallback(() => {
    // Obtener todos los escaneos completados
    const completedScans = files
      .filter((f) => f.status === "completed" && f.result)
      .map((f) => f.result);

    if (completedScans.length === 0) {
      alert("No hay escaneos completados para exportar");
      return;
    }

    // Crear contenido CSV
    const headers = Object.keys(completedScans[0] || {}).join(",");
    const rows = completedScans.map((scan) =>
      Object.values(scan || {})
        .map((value) =>
          // Manejar valores con comas envolviéndolos entre comillas
          typeof value === "string" && value.includes(",")
            ? `"${value}"`
            : value
        )
        .join(",")
    );

    const csvContent = [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    // Crear enlace de descarga y activar clic
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `passport_raw_scans_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Limpiar
    URL.revokeObjectURL(url);
  }, [files]);

  // Exportar a Excel con procesamiento de IA
  const exportToExcel = useCallback(async () => {
    // Obtener todos los escaneos completados
    const completedScans = files
      .filter((f) => f.status === "completed" && f.result)
      .map((f) => f.result as PassportResult);

    if (completedScans.length === 0) {
      alert("No hay escaneos completados para exportar");
      return;
    }

    setExportLoading(true);
    try {
      // Usar nuestra utilidad de exportación a Excel con procesamiento de IA
      const excelFile = await generateExcelFileFromMultiple(completedScans);
      downloadExcelFile(excelFile);
    } catch (error) {
      console.error("Error al exportar a Excel:", error);
      alert(
        "Error al generar el archivo Excel. Por favor, intente nuevamente."
      );
    } finally {
      setExportLoading(false);
    }
  }, [files]);

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
            Admite JPG, PNG, PDF (hasta 10MB cada uno)
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
          onClick={exportToCSV}
          disabled={files.filter((f) => f.status === "completed").length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
        >
          Exportar Datos Crudos (CSV)
        </button>

        <button
          onClick={exportToExcel}
          disabled={
            files.filter((f) => f.status === "completed").length === 0 ||
            exportLoading
          }
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300"
        >
          {exportLoading
            ? "Procesando con IA..."
            : `Exportar Formateado (Excel)${aiEnabled ? " con IA" : ""}`}
        </button>

        <button
          onClick={() => setFiles([])}
          disabled={files.length === 0}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-300"
        >
          Eliminar Todo
        </button>
      </div>

      {/* Estado de IA */}
      {aiEnabled && (
        <div className="mb-6 p-2 bg-indigo-50 border border-indigo-200 rounded-md">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <p className="text-sm text-indigo-700">
              Corrección inteligente con IA activada - Se usará al exportar
              Excel
            </p>
          </div>
        </div>
      )}

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
                  Resultados
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
                  <td className="px-6 py-4">
                    {file.status === "completed" && file.result && (
                      <details className="text-xs">
                        <summary className="cursor-pointer font-medium text-indigo-600">
                          Ver datos extraídos
                        </summary>
                        <div className="mt-2 max-h-32 overflow-y-auto">
                          {Object.entries(file.result).map(([key, value]) => (
                            <div key={key} className="mb-1">
                              <span className="font-medium">{key}:</span>{" "}
                              {value as string}
                            </div>
                          ))}
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
