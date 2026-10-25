
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export async function generateEmbedding(
  text: string,
): Promise<number[] | null> {
  if (!ai || !text.trim()) {
    console.warn("Embedding unavailable: missing API key or empty text.");
    return null;
  }

  try {
    const response = await ai.models.embedContent({
      model: "gemini-embedding-2",
      contents: text,
    });

    const values = response.embeddings?.[0]?.values;

    if (!values?.length) {
      console.warn("Embedding API returned no vector.");
      return null;
    }

    return [...values];
  } catch (error) {
    console.error(
      "Embedding generation failed; keyword fallback may be used:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
