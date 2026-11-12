"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const node_path_1 = __importDefault(require("node:path"));
const zod_1 = require("zod");
const admin_1 = require("./routes/admin");
const auth_1 = require("./routes/auth");
const subscription_1 = require("./routes/subscription");
const user_1 = require("./routes/user");
exports.app = (0, express_1.default)();
exports.app.use((0, helmet_1.default)());
exports.app.use(express_1.default.json({ limit: "20kb" }));
exports.app.use((0, cookie_parser_1.default)());
exports.app.use(express_1.default.static(node_path_1.default.resolve(process.cwd(), "public")));
exports.app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
exports.app.use("/api/auth", auth_1.authRouter);
exports.app.use("/api/user", user_1.userRouter);
exports.app.use("/api/subscription", subscription_1.subscriptionRouter);
exports.app.use("/api/admin", admin_1.adminRouter);
exports.app.use("/api", (_req, res) => res.status(404).json({ error: "API route not found" }));
exports.app.use((error, _req, res, _next) => {
    if (error instanceof zod_1.ZodError) {
        res.status(400).json({ error: "Invalid request", details: error.issues });
        return;
    }
    if (error && typeof error === "object" && "name" in error && error.name === "PrismaClientInitializationError" && "message" in error) {
        const message = String(error.message);
        if (/authentication failed|credentials.*not valid/i.test(message)) {
            console.error("Database authentication failed; check that DATABASE_URL credentials match the PostgreSQL server.");
            res.status(503).json({ error: "Database authentication failed. Check DATABASE_URL against your PostgreSQL credentials." });
            return;
        }
        if (/can't reach database server|could not connect to server|connection refused/i.test(message)) {
            console.error("Database server is unavailable; check that PostgreSQL is running and DATABASE_URL has the correct host and port.");
            res.status(503).json({ error: "Database server is unavailable. Start PostgreSQL and check DATABASE_URL host and port." });
            return;
        }
    }
    if (typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002") {
        res.status(409).json({ error: "An account with that email already exists" });
        return;
    }
    console.error("Unhandled request error", error);
    res.status(500).json({ error: "Internal server error" });
});
