import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { PassportResult } from "@/app/types/scan/Iscan";

// Initialize the OpenAI client server-side
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Use server-side environment variable
});

/**
 * API route to enhance passport data using OpenAI
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const passportData = (await request.json()) as PassportResult;

    // Create a prompt that explains what we want
    const prompt = `
      I have scanned passport data that may have some fields missing or in inconsistent formats.
      Please analyze this data and fill in any missing fields with plausible values based on the context.
      Also standardize date formats to DD/MM/YYYY.
      Here is the passport data: ${JSON.stringify(passportData, null, 2)}
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

    // Parse the JSON from the response
    try {
      // Remove markdown code blocks if present
      const cleanedJsonString = enhancedDataString
        ? enhancedDataString.replace(/```json\n?|\n?```/g, "")
        : "";

      const enhancedData = JSON.parse(cleanedJsonString) as PassportResult;

      // Return the enhanced data
      return NextResponse.json({
        success: true,
        data: enhancedData,
      });
    } catch (error) {
      console.error("Failed to parse AI response:", error);
      // If parsing fails, return the original data
      return NextResponse.json({
        success: true,
        data: passportData,
      });
    }
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    return NextResponse.json(
      { error: "Error enhancing passport data" },
      { status: 500 }
    );
  }
}
