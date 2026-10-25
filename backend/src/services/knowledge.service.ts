
import { prisma } from "../lib/prisma.js";
import { generateEmbedding } from "./embedding.service.js";

export type KnowledgeSource = {
  chunkId: string;
  documentId: string;
  filename: string;
  chunkIndex: number;
  content: string;
  score: number;
};

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "is", "are", "to", "of",
  "in", "on", "for", "with", "my", "i", "it", "if", "how",
  "what", "can", "do", "does", "this", "that", "be", "by",
  "from",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

function asVector(value: unknown): number[] | null {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    !value.every(
      (item) => typeof item === "number" && Number.isFinite(item),
    )
  ) {
    return null;
  }

  return value as number[];
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    return -1;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return -1;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function retrieveByKeywords(
  query: string,
  chunks: {
    id: string;
    documentId: string;
    chunkIndex: number;
    content: string;
    document: { id: string; filename: string };
  }[],
  limit: number,
): KnowledgeSource[] {
  const queryTerms = [...new Set(tokenize(query))];

  if (queryTerms.length === 0) {
    return [];
  }

  return chunks
    .map((chunk) => {
      const contentTerms = new Set(tokenize(chunk.content));
      const matched = queryTerms.filter((term) =>
        contentTerms.has(term),
      );

      return {
        chunkId: chunk.id,
        documentId: chunk.document.id,
        filename: chunk.document.filename,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        score:
          matched.length / queryTerms.length +
          (matched.length > 0 ? matched.length / 100 : 0),
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function retrieveKnowledge(
  query: string,
  limit = 4,
): Promise<KnowledgeSource[]> {
  const safeLimit = Math.max(1, Math.min(limit, 10));

  const chunks = await prisma.documentChunk.findMany({
    take: 1000,
    include: {
      document: {
        select: {
          id: true,
          filename: true,
        },
      },
    },
  });

  const queryEmbedding = await generateEmbedding(query);

  if (queryEmbedding) {
    const semanticResults = chunks
      .map((chunk) => {
        const vector = asVector(chunk.embedding);

        if (!vector || vector.length !== queryEmbedding.length) {
          return null;
        }

        const score = cosineSimilarity(queryEmbedding, vector);

        if (score <= 0) {
          return null;
        }

        return {
          chunkId: chunk.id,
          documentId: chunk.document.id,
          filename: chunk.document.filename,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          score,
        };
      })
      .filter(
        (item): item is KnowledgeSource => item !== null,
      )
      .sort((a, b) => b.score - a.score);

    if (semanticResults.length > 0) {
      return semanticResults.slice(0, safeLimit);
    }
  }

  return retrieveByKeywords(query, chunks, safeLimit);
}
