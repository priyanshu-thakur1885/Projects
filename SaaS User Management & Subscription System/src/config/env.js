"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
require("dotenv/config");
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(["development", "test", "production"]).default("development"),
    PORT: zod_1.z.coerce.number().int().positive().default(3000),
    DATABASE_URL: zod_1.z.string().min(1),
    ACCESS_TOKEN_SECRET: zod_1.z.string().min(32, "ACCESS_TOKEN_SECRET must be at least 32 characters"),
    REFRESH_TOKEN_SECRET: zod_1.z.string().min(32, "REFRESH_TOKEN_SECRET must be at least 32 characters"),
    ADMIN_EMAIL: zod_1.z.string().optional(),
    ADMIN_PASSWORD: zod_1.z.string().optional(),
});
exports.env = envSchema.parse(process.env);
