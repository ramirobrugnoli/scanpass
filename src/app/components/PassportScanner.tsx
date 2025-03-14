"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { PassportResult } from "../types/scan/Iscan";

export default function PassportScanner() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<PassportResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);

      // Crear URL para previsualización
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreview(objectUrl);

      // Limpiar resultados anteriores
      setResult(null);
      setError(null);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png"],
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleScan = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/scan", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error scanning document");
      }

      setResult(data.data);
    } catch (error: unknown) {
      console.error("Error:", error);
      if (error instanceof Error) {
        setError(error.message || "Error processing image");
      } else {
        setError("Error processing image");
      }
    } finally {
      setLoading(false);
    }
  };

  console.log("result:", result);

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Passport Scanner</h2>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-indigo-500 bg-indigo-50"
            : "border-gray-300 hover:border-indigo-300"
        }`}
      >
        <input {...getInputProps()} />

        {preview ? (
          <div className="flex flex-col items-center">
            <div className="relative w-full max-w-md h-64">
              <Image
                src={preview}
                alt="Document preview"
                fill
                className="object-contain"
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Click or drag to replace
            </p>
          </div>
        ) : (
          <div>
            <p className="text-lg">
              Drag and drop a passport image here, or click to select
            </p>
            <p className="text-sm text-gray-500 mt-2">Supports JPG, PNG, PDF</p>
          </div>
        )}
      </div>

      {/* Scan button */}
      {file && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={handleScan}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300"
          >
            {loading ? "Scanning..." : "Scan Document"}
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
          <p>{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="mt-6 p-4 border rounded-md">
          <h3 className="text-xl font-semibold mb-3">Scan Results</h3>

          <div className="grid grid-cols-1 gap-2">
            {Object.entries(result).map(([key, value]) => (
              <div key={key} className="flex border-b pb-2">
                <span className="font-medium w-1/3">{key}:</span>
                <span className="w-2/3">{value as string}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
