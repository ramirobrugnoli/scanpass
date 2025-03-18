import { useCallback } from "react";
import imageCompression from "browser-image-compression";

interface CompressionOptions {
  maxSizeMB: number;
  maxWidthOrHeight: number;
  useWebWorker: boolean;
}

export const useImageCompression = () => {
  const compressImage = useCallback(async (file: File): Promise<File> => {
    if (!file.type.startsWith("image/")) {
      // If not an image (e.g., PDF), return original file
      return file;
    }

    const options: CompressionOptions = {
      maxSizeMB: 1, // Maximum size in MB
      maxWidthOrHeight: 1800, // Reduce resolution while maintaining readability
      useWebWorker: true, // Use web worker for better performance
    };

    try {
      const compressedFile = await imageCompression(file, options);
      console.log(`Original size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(
        `Compressed size: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`
      );
      return compressedFile;
    } catch (error) {
      console.error("Error compressing image:", error);
      return file; // Return original file if compression fails
    }
  }, []);

  return { compressImage };
};
