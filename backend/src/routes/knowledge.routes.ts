
import { Router } from "express";
import multer from "multer";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/authenticate.js";
import { retrieveKnowledge } from "../services/knowledge.service.js";
import { generateGroundedAnswer } from "../services/ai-draft.service.js";
import { generateEmbedding } from "../services/embedding.service.js";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse") as (
  dataBuffer: Buffer
) => Promise<{ text: string }>;

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    const allowed =
      file.mimetype === "text/plain" ||
      file.mimetype === "application/pdf";

    if (!allowed) {
      callback(new Error("Only PDF and TXT files are allowed"));
      return;
    }

    callback(null, true);
  },
});

function splitIntoChunks(text: string): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const chunks: string[] = [];
  const chunkSize = 1000;
  const overlap = 150;
  const step = chunkSize - overlap;

  for (let start = 0; start < cleaned.length; start += step) {
    const chunk = cleaned.slice(start, start + chunkSize).trim();

    if (chunk) {
      chunks.push(chunk);
    }
  }

  return chunks;
}

// All knowledge-base endpoints require authentication.
router.use(authenticate);

// Upload a PDF or TXT document.
router.post(
  "/upload",
  (req, res, next) => {
    upload.single("file")(req, res, (error) => {
      if (error) {
        const message =
          error instanceof multer.MulterError &&
          error.code === "LIMIT_FILE_SIZE"
            ? "File must be 5 MB or smaller"
            : error.message;

        res.status(400).json({ error: message });
        return;
      }

      next();
    });
  },
  async (req, res) => {
    try {
      if (
        req.auth?.role !== "ADMIN" &&
        req.auth?.role !== "SUPPORT_AGENT"
      ) {
        res.status(403).json({
          error: "Only support agents and admins can upload documents",
        });
        return;
      }

      const file = req.file;

      if (!file) {
        res.status(400).json({
          error: "Please select a PDF or TXT file",
        });
        return;
      }

      const isPdf = file.mimetype === "application/pdf";
      const isTxt = file.mimetype === "text/plain";

      if (!isPdf && !isTxt) {
        res.status(400).json({
          error: "Unsupported file type",
        });
        return;
      }

      // Check the file extension as well as the supplied MIME type.
      const filename = file.originalname.split(/[\\/]/).pop() ?? "";
      const extension = filename.split(".").pop()?.toLowerCase();

      if (
        (isPdf && extension !== "pdf") ||
        (isTxt && extension !== "txt")
      ) {
        res.status(400).json({
          error: "File extension does not match its file type",
        });
        return;
      }

      let extractedText: string;

      if (isPdf) {
        const parsed = await pdfParse(file.buffer);
        extractedText = parsed.text;
      } else {
        extractedText = file.buffer.toString("utf8");
      }

      if (!extractedText.trim()) {
        res.status(400).json({
          error: "No readable text found in the document",
        });
        return;
      }

      const contentHash = createHash("sha256")
        .update(file.buffer)
        .digest("hex");

      const chunks = splitIntoChunks(extractedText);

      if (chunks.length === 0) {
        res.status(400).json({
          error: "The document does not contain usable text",
        });
        return;
      }
      
const chunksWithEmbeddings: {
  content: string;
  chunkIndex: number;
  embedding: number[] | null;
}[] = [];

for (const [chunkIndex, content] of chunks.entries()) {
  console.log(
    `Generating embedding for chunk ${chunkIndex + 1}/${chunks.length}`,
  );

  const embedding = await generateEmbedding(content);

  chunksWithEmbeddings.push({
    content,
    chunkIndex,
    embedding,
  });
}


      
const document = await prisma.$transaction(async (tx) => {
  const created = await tx.knowledgeDocument.create({
    data: {
      filename,
      mimeType: file.mimetype,
      contentHash,
      uploadedById: req.auth!.userId,
    },
  });

  await tx.documentChunk.createMany({
    data: chunksWithEmbeddings.map(
      ({ content, chunkIndex, embedding }) => ({
        documentId: created.id,
        chunkIndex,
        content,
        ...(embedding ? { embedding } : {}),
        metadata: { filename, chunkIndex },
      }),
    ),
  });

  return created;
});


      res.status(201).json({
        message: "Document uploaded and processed successfully",
        document: {
          id: document.id,
          filename: document.filename,
          mimeType: document.mimeType,
          uploadedAt: document.uploadedAt,
        },
        chunksCreated: chunks.length,
      });
    } catch (error) {
      const prismaError = error as { code?: string };

      if (prismaError.code === "P2002") {
        res.status(409).json({
          error: "You have already uploaded this document",
        });
        return;
      }

      console.error("Knowledge document upload failed:", error);
      res.status(500).json({
        error: "Failed to process document",
      });
    }
  }
);

// Search document chunks using keyword relevance.
router.get("/search", async (req, res) => {
  try {
    if (
      req.auth?.role !== "ADMIN" &&
      req.auth?.role !== "SUPPORT_AGENT"
    ) {
      res.status(403).json({
        error: "Only support agents and admins can search the knowledge base",
      });
      return;
    }

    const query = String(req.query.q ?? "").trim();

    if (!query) {
      res.status(400).json({
        error: "Please provide a search query using ?q=",
      });
      return;
    }

    if (query.length > 1000) {
      res.status(400).json({
        error: "Search query must be 1000 characters or fewer",
      });
      return;
    }

    const sources = await retrieveKnowledge(query, 4);

    res.json({
      query,
      results: sources.map((source) => ({
        documentId: source.documentId,
        filename: source.filename,
        chunkId: source.chunkId,
        chunkIndex: source.chunkIndex,
        content: source.content,
        score: Number(source.score.toFixed(3)),
      })),
      resultCount: sources.length,
    });
  } catch (error) {
    console.error("Knowledge search failed:", error);
    res.status(500).json({
      error: "Failed to search the knowledge base",
    });
  }
});

router.post("/answer", async (req, res) => {
  try {
    if (
      req.auth?.role !== "ADMIN" &&
      req.auth?.role !== "SUPPORT_AGENT"
    ) {
      res.status(403).json({
        error: "Only support agents and admins can ask knowledge-base questions",
      });
      return;
    }

    const question = String(req.body?.question ?? "").trim();

    if (!question) {
      res.status(400).json({
        error: "Please provide a question",
      });
      return;
    }

    if (question.length > 1000) {
      res.status(400).json({
        error: "Question must be 1000 characters or fewer",
      });
      return;
    }

    const sources = await retrieveKnowledge(question, 4);
    const answer = await generateGroundedAnswer(question, sources);

    res.json({
      question,
      answer,
      sources: sources.map((source) => ({
        documentId: source.documentId,
        filename: source.filename,
        chunkId: source.chunkId,
        chunkIndex: source.chunkIndex,
      })),
    });
  } catch (error) {
    console.error("Knowledge answer generation failed:", error);
    res.status(500).json({
      error: "Failed to generate an answer",
    });
  }
});

export default router;
