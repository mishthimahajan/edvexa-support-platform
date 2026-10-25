
import "dotenv/config";
import app from "./app.js";
import { prisma } from "./lib/prisma.js";

const port = Number(process.env.PORT ?? 4000);

async function startServer() {
  try {
    await prisma.$connect();

    app.listen(port, () => {
      console.log(`API running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

startServer();
