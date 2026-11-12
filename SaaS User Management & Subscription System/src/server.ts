import { env } from "./config/env";
import { app } from "./app";
import { prisma } from "./lib/prisma";

const server = app.listen(env.PORT, () => {
  console.info(`SaaS API and dashboard listening on http://localhost:${env.PORT}`);
});

async function shutdown(signal: string) {
  console.info(`${signal} received; shutting down`);
  server.close(async (error) => {
    if (error) {
      console.error("HTTP server shutdown failed", error);
      process.exitCode = 1;
    }
    await prisma.$disconnect();
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
