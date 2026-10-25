
import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(72),
});

const registerSchema = credentialsSchema.extend({
  name: z.string().trim().min(2).max(100),
});

function createToken(userId: string) {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign({}, secret, {
    subject: userId,
    expiresIn: "1d",
  });
}

router.post("/register", async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid registration data",
        details: parsed.error.flatten(),
      });
      return;
    }

    const { name, email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
        role: "USER",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    res.status(201).json({
      user,
      token: createToken(user.id),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const parsed = credentialsSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid email or password format" });
      return;
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    const passwordMatches = user
      ? await bcrypt.compare(password, user.passwordHash)
      : false;

    if (!user || !passwordMatches) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token: createToken(user.id),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

export default router;
