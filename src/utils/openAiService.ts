// src/services/openAIService.ts
import OpenAI from "openai";
import { PassportResult } from "@/app/types/scan/Iscan";

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

/**
 * Enhances passport data using OpenAI's GPT models
 * This can be used to fill missing fields or standardize data formats
 */
export async function enhancePassportDataWithAI(
  passportData: PassportResult
): Promise<PassportResult> {
  try {
    // Create a prompt that explains what we want
    const prompt = `
        I have scanned passport data that may have some fields missing or in inconsistent formats.
        Please analyze this data and fill in any missing fields with plausible values based on the context.
        Also standardize date formats to DD/MM/YYYY.
        Here is the passport data:  ${JSON.stringify(passportData, null, 2)}
        Please return ONLY a valid JSON object without any markdown formatting, code blocks, or explanations.
        `;

    // Make the API call to OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // You can also use "gpt-3.5-turbo" for cost efficiency
      messages: [
        {
          role: "system",
          content:
            "You are an assistant that helps process passport data accurately.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent outputs
    });

    // Get the response content
    const enhancedDataString = completion.choices[0].message.content;
    console.log("Respuesta de OpenAI:", enhancedDataString);

    // Parse the JSON from the response
    // We use a try-catch here as the model might not always return valid JSON
    try {
      // Remove markdown code blocks if present
      const cleanedJsonString = enhancedDataString
        ? enhancedDataString.replace(/```json\n?|\n?```/g, "")
        : "";

      const enhancedData = JSON.parse(cleanedJsonString) as PassportResult;
      return enhancedData;
    } catch (error) {
      console.error("Failed to parse AI response:", error);
      // If parsing fails, return the original data
      return passportData;
    }
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    // In case of API errors, fallback to original data
    return passportData;
  }
}

/**
 * Fallback function that processes passport data without AI
 * Used when API keys are missing or API calls fail
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
