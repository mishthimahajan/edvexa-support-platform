
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

try {
  const response = await ai.models.embedContent({
    model: "gemini-embedding-2",
    contents: "A customer cannot sign in and needs a password reset",
  });

  const values = response.embeddings?.[0]?.values;

  console.log("Embedding returned:", Boolean(values));
  console.log("Vector length:", values?.length ?? 0);
} catch (error) {
  console.error("Gemini error:", error.message);
}
