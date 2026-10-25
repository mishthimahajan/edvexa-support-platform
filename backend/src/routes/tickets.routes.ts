
import { Router } from "express";
import { z } from "zod";
import { TicketStatus, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/authenticate.js";
import { retrieveKnowledge } from "../services/knowledge.service.js";
import { generateMockDraft } from "../services/ai-draft.service.js";
import { SuggestionStatus } from "@prisma/client";
const router = Router();

const createTicketSchema = z.object({
  subject: z.string().trim().min(5).max(200),
  description: z.string().trim().min(10).max(10000),
  category: z.string().trim().min(2).max(100).default("General"),
});

router.use(authenticate);

// Create a ticket
router.post("/", async (req, res, next) => {
  try {
    const parsed = createTicketSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid ticket data",
        details: parsed.error.flatten(),
      });
      return;
    }

    const ticket = await prisma.ticket.create({
      data: {
        title: parsed.data.subject,
        description: parsed.data.description,
        category: parsed.data.category,
        creatorId: req.auth!.userId,
        messages: {
          create: {
            authorId: req.auth!.userId,
            body: parsed.data.description,
          },
        },
        history: {
          create: {
            changedById: req.auth!.userId,
            toStatus: "OPEN",
            note: "Ticket created",
          },
        },
      },
      include: {
        messages: true,
        history: true,
      },
    });

    res.status(201).json({ ticket });
  } catch (error) {
    next(error);
  }
});

// List tickets visible to the current user
router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const search = String(req.query.search ?? "").trim();

    const where: Prisma.TicketWhereInput = {};

    if (req.auth!.role === "USER") {
      where.creatorId = req.auth!.userId;
    }

    if (req.query.status) {
      const parsedStatus = z.nativeEnum(TicketStatus).safeParse(
        req.query.status
      );

      if (!parsedStatus.success) {
        res.status(400).json({ error: "Invalid ticket status" });
        return;
      }

      where.status = parsedStatus.data;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          creator: {
            select: { id: true, name: true, email: true },
          },
          _count: { select: { messages: true } },
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    res.json({
      tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});


/* Add a reply to a ticket */
router.post("/:id/messages", async (req, res, next) => {
  try {
    const parsed = z.object({
      body: z.string().trim().min(1).max(10000),
    }).safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Message must contain 1–10000 characters" });
      return;
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      select: { id: true, creatorId: true, status: true },
    });

    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    if (
      req.auth!.role === "USER" &&
      ticket.creatorId !== req.auth!.userId
    ) {
      res.status(403).json({ error: "You cannot reply to this ticket" });
      return;
    }

    if (ticket.status === "CLOSED") {
      res.status(400).json({ error: "Cannot reply to a closed ticket" });
      return;
    }

    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        authorId: req.auth!.userId,
        body: parsed.data.body,
      },
      include: {
        author: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { updatedAt: new Date() },
    });

    res.status(201).json({ message });
  } catch (error) {
    next(error);
  }
});

/* Change ticket status: support agents and admins only */
router.patch("/:id/status", async (req, res, next) => {
  try {
    if (!["SUPPORT_AGENT", "ADMIN"].includes(req.auth!.role)) {
      res.status(403).json({
        error: "Only support agents and admins can change ticket status",
      });
      return;
    }

    const parsed = z.object({
      status: z.nativeEnum(TicketStatus),
      note: z.string().trim().max(500).optional(),
    }).safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid status",
        details: parsed.error.flatten(),
      });
      return;
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      select: { id: true, status: true },
    });

    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    if (ticket.status === parsed.data.status) {
      res.status(400).json({ error: "Ticket already has that status" });
      return;
    }

    const updatedTicket = await prisma.$transaction(async (tx) => {
      await tx.ticketStatusHistory.create({
        data: {
          ticketId: ticket.id,
          changedById: req.auth!.userId,
          fromStatus: ticket.status,
          toStatus: parsed.data.status,
          note: parsed.data.note,
        },
      });

      return tx.ticket.update({
        where: { id: ticket.id },
        data: { status: parsed.data.status },
        include: { history: { orderBy: { createdAt: "asc" } } },
      });
    });

    res.json({ ticket: updatedTicket });
  } catch (error) {
    next(error);
  }
});


// Get one ticket with its messages and status history
router.get("/:id", async (req, res, next) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          include: {
            author: {
              select: { id: true, name: true, role: true },
            },
          },
        },
        history: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    if (
      req.auth!.role === "USER" &&
      ticket.creatorId !== req.auth!.userId
    ) {
      res.status(403).json({ error: "You cannot access this ticket" });
      return;
    }

    res.json({ ticket });
  } catch (error) {
    next(error);
  }
});



/* Generate an AI-assisted support reply draft */
router.post("/:id/ai-draft", async (req, res, next) => {
  try {
    // Only support agents and admins can generate drafts.
    if (!["SUPPORT_AGENT", "ADMIN"].includes(req.auth!.role)) {
      res.status(403).json({
        error: "Only support agents and admins can generate AI drafts",
      });
      return;
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    if (ticket.status === "CLOSED") {
      res.status(400).json({
        error: "Cannot generate a draft for a closed ticket",
      });
      return;
    }

    // Search the knowledge base using the ticket details.
    const query = [
      ticket.title,
      ticket.description,
      ...ticket.messages.map((message) => message.body),
    ].join(" ");

    const sources = await retrieveKnowledge(query, 4);

    // Generate a draft using the mock provider.
    const draft = generateMockDraft(
      {
        title: ticket.title,
        description: ticket.description,
        latestMessage: ticket.messages[0]?.body,
      },
      sources,
    );

    // Save the draft and its source references.
    const suggestion = await prisma.aiSuggestion.create({
      data: {
        ticketId: ticket.id,
        draft,
        sources: sources.map((source) => ({
          chunkId: source.chunkId,
          documentId: source.documentId,
          filename: source.filename,
          chunkIndex: source.chunkIndex,
          score: source.score,
        })),
      },
    });

    res.status(201).json({
      message: "Support reply draft generated successfully",
      provider: "mock",
      suggestion,
      sourceCount: sources.length,
    });
  } catch (error) {
    next(error);
  }
});

/* Approve or reject an AI-generated support reply draft */
router.patch("/:id/ai-suggestions/:suggestionId", async (req, res, next) => {
  try {
    if (!["SUPPORT_AGENT", "ADMIN"].includes(req.auth!.role)) {
      res.status(403).json({
        error: "Only support agents and admins can review AI drafts",
      });
      return;
    }

    const { status } = req.body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      res.status(400).json({
        error: "Status must be APPROVED or REJECTED",
      });
      return;
    }

    const { id: ticketId, suggestionId } = req.params;

    const suggestion = await prisma.aiSuggestion.findFirst({
      where: {
        id: suggestionId,
        ticketId,
      },
    });

    if (!suggestion) {
      res.status(404).json({
        error: "AI suggestion not found for this ticket",
      });
      return;
    }

    if (suggestion.status !== "PENDING") {
      res.status(409).json({
        error: "This suggestion has already been reviewed",
      });
      return;
    }

    const updatedSuggestion = await prisma.aiSuggestion.update({
      where: { id: suggestion.id },
      data: {
        status: status as SuggestionStatus,
        reviewerId: req.auth!.userId,
        reviewedAt: new Date(),
      },
    });

    res.status(200).json({
      message: `AI draft ${status.toLowerCase()} successfully`,
      suggestion: updatedSuggestion,
    });
  } catch (error) {
    next(error);
  }
});


export default router;
