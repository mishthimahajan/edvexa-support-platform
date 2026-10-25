
import { Router } from "express";
import { TicketStatus, UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

router.use(authenticate);

router.get("/", async (req, res, next) => {
  try {
    const userId = req.auth?.userId;
    const role = req.auth?.role;

    if (!userId || !role) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const isAgent =
      role === UserRole.SUPPORT_AGENT ||
      role === UserRole.ADMIN;

    const ticketScope = isAgent
      ? {}
      : { creatorId: userId };

    const [
      total,
      open,
      inProgress,
      resolved,
      closed,
      assignedToMe,
      recentTickets,
      recentActivity,
    ] = await Promise.all([
      prisma.ticket.count({ where: ticketScope }),
      prisma.ticket.count({
        where: { ...ticketScope, status: TicketStatus.OPEN },
      }),
      prisma.ticket.count({
        where: {
          ...ticketScope,
          status: TicketStatus.IN_PROGRESS,
        },
      }),
      prisma.ticket.count({
        where: {
          ...ticketScope,
          status: TicketStatus.RESOLVED,
        },
      }),
      prisma.ticket.count({
        where: { ...ticketScope, status: TicketStatus.CLOSED },
      }),
      isAgent
        ? prisma.ticket.count({
            where: { assigneeId: userId },
          })
        : Promise.resolve(0),
      prisma.ticket.findMany({
        where: ticketScope,
        take: 5,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          category: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          creator: { select: { id: true, name: true, email: true } },
          assignee: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.ticketStatusHistory.findMany({
        where: {
          ticket: ticketScope,
        },
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          fromStatus: true,
          toStatus: true,
          note: true,
          createdAt: true,
          ticket: {
            select: { id: true, title: true },
          },
          changedBy: {
            select: { id: true, name: true },
          },
        },
      }),
    ]);

    res.json({
      metrics: {
        total,
        open,
        inProgress,
        resolved,
        closed,
        assignedToMe,
      },
      recentTickets,
      recentActivity,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
