
import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

const secret = process.env.JWT_SECRET;

if (!secret || secret.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters");
}

export const authenticate: RequestHandler = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const token = header.slice(7);
    const payload = jwt.verify(token, secret);

    if (typeof payload === "string" || typeof payload.sub !== "string") {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true },
    });

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    req.auth = { userId: user.id, role: user.role };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
