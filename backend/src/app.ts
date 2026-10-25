
import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/auth.routes.js";
import ticketRoutes from "./routes/tickets.routes.js";
import knowledgeRoutes from "./routes/knowledge.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
const app = express();

app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
  }),
);

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "edvexa-support-api",
  });
});
app.use("/api/auth", authRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/knowledge", knowledgeRoutes);
app.use("/api/dashboard", dashboardRoutes);
export default app;
