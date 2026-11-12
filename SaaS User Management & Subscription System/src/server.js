"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = require("./config/env");
const app_1 = require("./app");
const prisma_1 = require("./lib/prisma");
const server = app_1.app.listen(env_1.env.PORT, () => {
    console.info(`SaaS API and dashboard listening on http://localhost:${env_1.env.PORT}`);
});
async function shutdown(signal) {
    console.info(`${signal} received; shutting down`);
    server.close(async (error) => {
        if (error) {
            console.error("HTTP server shutdown failed", error);
            process.exitCode = 1;
        }
        await prisma_1.prisma.$disconnect();
    });
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
