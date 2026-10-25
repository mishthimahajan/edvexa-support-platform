
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { generateEmbedding } from "../services/embedding.service.js";

async function main() {
  const chunks = await prisma.documentChunk.findMany({
    where: { embedding: { equals: Prisma.DbNull } },
    include: {
      document: {
        select: { filename: true },
      },
    },
  });

  console.log(`Chunks missing embeddings: ${chunks.length}`);

  let succeeded = 0;
  let failed = 0;

  for (const [index, chunk] of chunks.entries()) {
    console.log(
      `[${index + 1}/${chunks.length}] ${chunk.document.filename}, chunk ${chunk.chunkIndex}`,
    );

    try {
      const embedding = await generateEmbedding(chunk.content);

      if (!embedding) {
        failed++;
        console.log("  No embedding returned; skipping.");
        continue;
      }

      await prisma.documentChunk.update({
        where: { id: chunk.id },
        data: {
          embedding: embedding as Prisma.InputJsonValue,
        },
      });

      succeeded++;
      console.log(`  Saved ${embedding.length} embedding values.`);
    } catch (error) {
      failed++;
      console.error(
        "  Failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  console.log("\nBackfill finished.");
  console.log(`Updated: ${succeeded}`);
  console.log(`Failed or skipped: ${failed}`);
}

main()
  .catch((error) => {
    console.error("Backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
