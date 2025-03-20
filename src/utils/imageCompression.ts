// src/utils/imageCompression.ts - versión optimizada
import { useCallback } from "react";
import imageCompression from "browser-image-compression";

interface CompressionOptions {
  maxSizeMB: number;
  maxWidthOrHeight: number;
  useWebWorker: boolean;
  initialQuality?: number;
  alwaysKeepResolution?: boolean;
  fileType?: string;
  onProgress?: (progress: number) => void;
}

interface CompressionStats {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

export const useImageCompression = () => {
  /**
   * Comprime una imagen para optimizar el procesamiento OCR
   * @param file - El archivo de imagen original
   * @param isPassport - Si es una imagen de pasaporte (aplicará optimizaciones específicas)
   * @returns - El archivo comprimido y estadísticas de compresión
   */
  const compressImage = useCallback(
    async (
      file: File,
      isPassport: boolean = true
    ): Promise<{ compressedFile: File; stats: CompressionStats }> => {
      // Si no es una imagen (ej. PDF), devolver archivo original
      if (!file.type.startsWith("image/")) {
        return {
          compressedFile: file,
          stats: {
            originalSize: file.size,
            compressedSize: file.size,
            compressionRatio: 1,
          },
        };
      }

      // Tamaño original en MB para el log
      const originalSizeMB = file.size / 1024 / 1024;

      // Opciones de compresión optimizadas para pasaportes
      const options: CompressionOptions = isPassport
        ? {
            maxSizeMB: 0.5, // Limitar a 500KB (adecuado para pasaportes)
            maxWidthOrHeight: 1000, // Resolución suficiente para OCR
            useWebWorker: true, // Mejor rendimiento
            initialQuality: 0.8, // 80% de calidad (buen balance)
            alwaysKeepResolution: false, // Permitir reducción de resolución
            fileType: "image/jpeg", // Forzar JPEG para mejor compresión
            onProgress: (progress) => {
              console.log(`Compresión: ${Math.round(progress * 100)}%`);
            },
          }
        : {
            // Opciones más conservadoras para otras imágenes
            maxSizeMB: 1,
            maxWidthOrHeight: 1500,
            useWebWorker: true,
            initialQuality: 0.9,
          };

      try {
        // Aplicar compresión
        console.log(
          `Iniciando compresión. Tamaño original: ${originalSizeMB.toFixed(
            2
          )} MB`
        );
        const compressedFile = await imageCompression(file, options);

        // Calcular estadísticas
        const compressedSizeMB = compressedFile.size / 1024 / 1024;
        const compressionRatio = file.size / compressedFile.size;

        console.log(`Compresión completada:
        - Tamaño original: ${originalSizeMB.toFixed(2)} MB
        - Tamaño comprimido: ${compressedSizeMB.toFixed(2)} MB
        - Ratio de compresión: ${compressionRatio.toFixed(1)}x
        - Reducción: ${((1 - compressedFile.size / file.size) * 100).toFixed(
          1
        )}%`);

        return {
          compressedFile,
          stats: {
            originalSize: file.size,
            compressedSize: compressedFile.size,
            compressionRatio: compressionRatio,
          },
        };
      } catch (error) {
        console.error("Error comprimiendo imagen:", error);

        // Devolver archivo original en caso de error
        return {
          compressedFile: file,
          stats: {
            originalSize: file.size,
            compressedSize: file.size,
            compressionRatio: 1,
          },
        };
      }
    },
    []
  );

  /**
   * Preprocesa una imagen para mejorar la captura de texto por OCR
   * @param file - Archivo de imagen a preprocesar
   * @returns - Imagen preprocesada con mejoras para OCR
   */
  const preprocessForOCR = useCallback(async (file: File): Promise<File> => {
    // Esta función requeriría canvas o una biblioteca de procesamiento de imágenes
    // Por ahora, es un placeholder para futuras mejoras
    console.log("Preprocesamiento para OCR: función placeholder");
    return file;
  }, []);

  return {
    compressImage,
    preprocessForOCR,
  };
};
