// src/utils/openAiService.ts
import { PassportResult } from "@/app/types/scan/Iscan";

/**
 * Enhances passport data using OpenAI's GPT models via server-side API
 * This can be used to fill missing fields or standardize data formats
 */
export async function enhancePassportDataWithAI(
  passportData: PassportResult
): Promise<PassportResult> {
  try {
    // Call our server-side API endpoint instead of OpenAI directly
    const response = await fetch("/api/openai/enhance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(passportData),
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success && result.data) {
      return result.data as PassportResult;
    } else {
      // If there was an issue but the API handled it gracefully
      return passportData;
    }
  } catch (error) {
    console.error("Error enhancing passport data:", error);
    // In case of API errors, fallback to original data
    return passportData;
  }
}

/**
 * Fallback function that processes passport data without AI
 * Used when API calls fail
 */
export function processPassportDataLocally(
  passportData: PassportResult
): PassportResult {
  // Simple data cleaning and standardization
  const processedData = { ...passportData };

  // Standardize date formats if possible
  if (processedData.date_of_birth) {
    processedData.date_of_birth = standardizeDate(processedData.date_of_birth);
  }
  if (processedData.date_of_expiry) {
    processedData.date_of_expiry = standardizeDate(
      processedData.date_of_expiry
    );
  }
  if (processedData.date_of_issue) {
    processedData.date_of_issue = standardizeDate(processedData.date_of_issue);
  }

  return processedData;
}

/**
 * Helper function to standardize date formats
 */
function standardizeDate(dateStr: string): string {
  // Try to convert various date formats to DD/MM/YYYY
  // This is a simple implementation - could be expanded for more formats

  // Check if it's already in desired format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    return dateStr;
  }

  // Try to parse ISO format (YYYY-MM-DD)
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }

  // Try to parse American format (MM/DD/YYYY)
  const usMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (usMatch) {
    return `${usMatch[2]}/${usMatch[1]}/${usMatch[3]}`;
  }

  // If no recognized format, return as is
  return dateStr;
}
