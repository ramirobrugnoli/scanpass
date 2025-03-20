// src/app/components/CompressionTester.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useImageCompression } from "@/utils/imageCompression";
import Image from "next/image";

export default function CompressionTester() {
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [compressedImage, setCompressedImage] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [compressedPreview, setCompressedPreview] = useState<string | null>(
    null
  );
  const [compressionStats, setCompressionStats] = useState<{
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    savingsPercent: number;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { compressImage } = useImageCompression();

  // Limpiar URLs cuando el componente se desmonte
  useEffect(() => {
    return () => {
      if (originalPreview) URL.revokeObjectURL(originalPreview);
      if (compressedPreview) URL.revokeObjectURL(compressedPreview);
    };
  }, [originalPreview, compressedPreview]);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!event.target.files || event.target.files.length === 0) return;

    const file = event.target.files[0];
    setOriginalImage(file);

    // Crear URL para previsualizar imagen original
    if (originalPreview) URL.revokeObjectURL(originalPreview);
    const preview = URL.createObjectURL(file);
    setOriginalPreview(preview);

    // Limpiar compresión anterior
    setCompressedImage(null);
    setCompressedPreview(null);
    setCompressionStats(null);
  };

  const handleCompression = async () => {
    if (!originalImage) return;

    setLoading(true);

    try {
      // Comprimir imagen
      const { compressedFile, stats } = await compressImage(
        originalImage,
        true
      );
      setCompressedImage(compressedFile);

      // Crear URL para previsualizar imagen comprimida
      if (compressedPreview) URL.revokeObjectURL(compressedPreview);
      const preview = URL.createObjectURL(compressedFile);
      setCompressedPreview(preview);

      // Guardar estadísticas
      setCompressionStats({
        originalSize: stats.originalSize,
        compressedSize: stats.compressedSize,
        compressionRatio: stats.compressionRatio,
        savingsPercent: (1 - stats.compressedSize / stats.originalSize) * 100,
      });
    } catch (error) {
      console.error("Error al comprimir imagen:", error);
      alert("Error al comprimir la imagen");
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">
        Prueba de Compresión de Imágenes
      </h1>

      <div className="mb-6">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          ref={fileInputRef}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mr-4"
        >
          Seleccionar imagen
        </button>

        <button
          onClick={handleCompression}
          disabled={!originalImage || loading}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
        >
          {loading ? "Comprimiendo..." : "Comprimir imagen"}
        </button>
      </div>

      {originalImage && (
        <div className="mb-4">
          <p className="text-sm mb-2">
            Archivo seleccionado:{" "}
            <span className="font-semibold">{originalImage.name}</span> (
            {formatBytes(originalImage.size)})
          </p>
        </div>
      )}

      {compressionStats && (
        <div className="p-4 bg-gray-100 rounded-md mb-6">
          <h2 className="text-lg font-semibold mb-2">
            Resultados de la compresión
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-sm text-gray-600">Original</p>
              <p className="font-semibold">
                {formatBytes(compressionStats.originalSize)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Comprimido</p>
              <p className="font-semibold">
                {formatBytes(compressionStats.compressedSize)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Ratio</p>
              <p className="font-semibold">
                {compressionStats.compressionRatio.toFixed(1)}x
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Ahorro</p>
              <p className="font-semibold text-green-600">
                {compressionStats.savingsPercent.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {originalPreview && (
          <div className="border rounded-md p-4">
            <h2 className="text-lg font-semibold mb-2">Imagen Original</h2>
            <div className="relative h-80 w-full">
              <Image
                src={originalPreview}
                alt="Original"
                fill
                className="object-contain"
              />
            </div>
          </div>
        )}

        {compressedPreview && (
          <div className="border rounded-md p-4">
            <h2 className="text-lg font-semibold mb-2">Imagen Comprimida</h2>
            <div className="relative h-80 w-full">
              <Image
                src={compressedPreview}
                alt="Comprimida"
                fill
                className="object-contain"
              />
            </div>
          </div>
        )}
      </div>

      {compressedImage && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">
            Descargar imagen comprimida
          </h2>
          <a
            href={compressedPreview || "#"}
            download={`compressed_${originalImage?.name}`}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 inline-block"
          >
            Descargar
          </a>
          <p className="text-sm text-gray-600 mt-2">
            Esta imagen comprimida puede ser utilizada para subir al escáner de
            pasaportes.
          </p>
        </div>
      )}
    </div>
  );
}
