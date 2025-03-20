"use client";

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
  status: "pending" | "processing" | "completed" | "error" | "duplicate";
  result?: PassportResult;
  processedResult?: StandardizedData;
  error?: string;
  preview?: string;
  documentId?: string; // Store the document ID for duplicate detection
}

// Maximum number of concurrent requests
const MAX_CONCURRENT_REQUESTS = 5;

export default function BatchPassportScanner() {
  const [files, setFiles] = useState<ScanStatus[]>([]);
  const [processing, setProcessing] = useState<boolean>(false);
  const [completed, setCompleted] = useState<number>(0);
  const [failed, setFailed] = useState<number>(0);
  const [duplicates, setDuplicates] = useState<number>(0); // Track duplicate count
  const [exporting, setExporting] = useState<boolean>(false);
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set()); // Track processed document IDs
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

  // Process files in batches
  const processFiles = useCallback(async () => {
    if (processing) return;

    setProcessing(true);

    // Get all pending files
    const pendingFiles = files.filter((f) => f.status === "pending");

    if (pendingFiles.length === 0) {
      setProcessing(false);
      return;
    }

    // Process files in batches using a semaphore pattern
    const updateFileStatus = (index: number, updates: Partial<ScanStatus>) => {
      setFiles((prev) =>
        prev.map((file, i) => (i === index ? { ...file, ...updates } : file))
      );
    };

    let activeRequests = 0;
    let fileIndex = 0;

    const processNextFile = async () => {
      if (fileIndex >= pendingFiles.length) return;

      // Find the index in the original files array
      const originalIndex = files.findIndex(
        (f) => f.file === pendingFiles[fileIndex].file
      );
      fileIndex++;

      if (originalIndex === -1) return processNextFile();

      activeRequests++;
      updateFileStatus(originalIndex, { status: "processing" });

      try {
        // Compress the image (if it's an image)
        const compressedResult = await compressImage(files[originalIndex].file);

        // Create form data
        const formData = new FormData();
        formData.append("file", compressedResult.compressedFile);

        // Send request to API
        const response = await fetch("/api/scan", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Error scanning document");
        }

        const data = await response.json();
        const rawResult = data.data;

        // Extract document ID
        const documentId = rawResult.document_id;

        // Check if this document ID has already been processed
        if (documentId && processedIds.has(documentId)) {
          // This is a duplicate
          updateFileStatus(originalIndex, {
            status: "duplicate",
            result: rawResult,
            documentId,
            error: "Documento duplicado - ID ya procesado previamente",
          });
          setDuplicates((prev) => prev + 1);
        } else {
          // Process the data through our standardization service
          const processedResult = processPassportData(rawResult);

          updateFileStatus(originalIndex, {
            status: "completed",
            result: rawResult,
            processedResult,
            documentId,
          });

          // Add the document ID to the set of processed IDs
          if (documentId) {
            setProcessedIds((prev) => new Set(prev).add(documentId));
          }

          setCompleted((prev) => prev + 1);
        }
      } catch (error) {
        console.error("Error processing file:", error);
        updateFileStatus(originalIndex, {
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
        setFailed((prev) => prev + 1);
      } finally {
        activeRequests--;

        // If we can process more files, do so
        if (activeRequests < MAX_CONCURRENT_REQUESTS) {
          processNextFile();
        }

        // If no more active requests and no more files to process, we're done
        if (activeRequests === 0 && fileIndex >= pendingFiles.length) {
          setProcessing(false);
        }
      }
    };

    // Start initial batch of requests
    const initialBatchSize = Math.min(
      MAX_CONCURRENT_REQUESTS,
      pendingFiles.length
    );
    for (let i = 0; i < initialBatchSize; i++) {
      processNextFile();
    }
  }, [files, processing, compressImage, processedIds]);

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      files.forEach((file) => {
        if (file.preview) URL.revokeObjectURL(file.preview);
      });
    };
  }, [files]);

  // Export to CSV (raw data)
  const exportToCSV = useCallback(() => {
    // Get all completed scans (exclude duplicates)
    const completedScans = files
      .filter((f) => f.status === "completed" && f.result)
      .map((f) => f.result as PassportResult);

    if (completedScans.length === 0) {
      alert("No completed scans to export");
      return;
    }

    // Create CSV content
    const headers = Object.keys(completedScans[0] || {}).join(",");
    const rows = completedScans.map((scan) =>
      Object.values(scan || {})
        .map((value) =>
          // Handle values with commas by wrapping in quotes
          typeof value === "string" && value.includes(",")
            ? `"${value}"`
            : value
        )
        .join(",")
    );

    const csvContent = [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    // Create download link and trigger click
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `passport_raw_scans_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    URL.revokeObjectURL(url);
  }, [files]);

  // Export to Excel with AI enhancement (formatted data)
  const exportToExcel = useCallback(async () => {
    setExporting(true);

    try {
      // Get all completed scans (exclude duplicates)
      const completedScans = files
        .filter((f) => f.status === "completed" && f.result)
        .map((f) => f.result as PassportResult);

      if (completedScans.length === 0) {
        alert("No completed scans to export");
        return;
      }

      // Use our Excel export utility with AI enhancement
      const excelFile = await generateExcelFileFromMultiple(completedScans);
      downloadExcelFile(excelFile);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert(
        `Export error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setExporting(false);
    }
  }, [files]);

  // Clear processed IDs to reset duplicate detection
  const handleReset = () => {
    setFiles([]);
    setProcessedIds(new Set());
    setCompleted(0);
    setFailed(0);
    setDuplicates(0);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Batch Passport Scanner</h2>

      {/* Upload area */}
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
            Drag and drop passport images here, or click to select
          </p>
          <p className="text-sm text-black-500 mt-2">
            Supports JPG, PNG, PDF (up to 10MB each)
          </p>
          <p className="text-sm text-black-500 mt-1">
            {files.length} files selected
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={processFiles}
          disabled={
            processing ||
            files.filter((f) => f.status === "pending").length === 0
          }
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300"
        >
          {processing ? "Processing..." : "Process All Files"}
        </button>

        <button
          onClick={exportToCSV}
          disabled={files.filter((f) => f.status === "completed").length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
        >
          Export Raw (CSV)
        </button>

        <button
          onClick={exportToExcel}
          disabled={
            exporting ||
            files.filter((f) => f.status === "completed").length === 0
          }
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300"
        >
          {exporting ? "Processing & Exporting..." : "Export Formatted (Excel)"}
        </button>

        <button
          onClick={handleReset}
          disabled={files.length === 0}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-300"
        >
          Clear All
        </button>
      </div>

      {/* Progress */}
      {(processing || completed > 0 || failed > 0 || duplicates > 0) && (
        <div className="mb-6 p-4 border rounded-md bg-black-50">
          <h3 className="font-semibold mb-2">Progress</h3>
          <div className="flex flex-wrap gap-4">
            <div>
              <span className="text-black-600">Total:</span> {files.length}
            </div>
            <div>
              <span className="text-black-600">Pending:</span>{" "}
              {files.filter((f) => f.status === "pending").length}
            </div>
            <div>
              <span className="text-black-600">Processing:</span>{" "}
              {files.filter((f) => f.status === "processing").length}
            </div>
            <div>
              <span className="text-green-600">Completed:</span> {completed}
            </div>
            <div>
              <span className="text-yellow-600">Duplicates:</span> {duplicates}
            </div>
            <div>
              <span className="text-red-600">Failed:</span> {failed}
            </div>
          </div>

          {/* Progress bar */}
          {files.length > 0 && (
            <div className="w-full bg-black-200 rounded-full h-2.5 mt-2">
              <div
                className="bg-indigo-600 h-2.5 rounded-full"
                style={{
                  width: `${
                    ((completed + failed + duplicates) / files.length) * 100
                  }%`,
                }}
              ></div>
            </div>
          )}
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="border rounded-md overflow-hidden">
          <table className="min-w-full divide-y divide-black-200">
            <thead className="bg-black-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-black-500 uppercase tracking-wider">
                  Preview
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black-500 uppercase tracking-wider">
                  Filename
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black-500 uppercase tracking-wider">
                  Document ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black-500 uppercase tracking-wider">
                  Results
                </th>
              </tr>
            </thead>
            <tbody className="bg-black divide-y divide-white-200">
              {files.map((file, index) => (
                <tr
                  key={index}
                  className={file.status === "duplicate" ? "bg-red-50" : ""}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    {file.preview && (
                      <div className="h-16 w-24 relative">
                        <Image
                          src={file.preview}
                          alt="Preview"
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
                        file.status === "duplicate"
                          ? "bg-red-100 text-red-800"
                          : ""
                      }
                      ${
                        file.status === "error" ? "bg-red-100 text-red-800" : ""
                      }
                    `}
                    >
                      {file.status === "duplicate"
                        ? "Duplicado"
                        : file.status.charAt(0).toUpperCase() +
                          file.status.slice(1)}
                    </span>
                    {file.error && (
                      <div className="text-xs text-red-500 mt-1">
                        {file.error}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {file.documentId && (
                      <span className="text-sm">{file.documentId}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {(file.status === "completed" ||
                      file.status === "duplicate") &&
                      file.result && (
                        <details className="text-xs">
                          <summary className="cursor-pointer font-medium text-indigo-600">
                            View Scan Results
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

                    {file.status === "completed" && file.processedResult && (
                      <details className="text-xs mt-2">
                        <summary className="cursor-pointer font-medium text-indigo-600">
                          View Formatted Data
                        </summary>
                        <div className="mt-2 max-h-32 overflow-y-auto">
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
