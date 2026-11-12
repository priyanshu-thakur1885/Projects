"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const node_crypto_1 = require("node:crypto");
const express_1 = require("express");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const zod_1 = require("zod");
const env_1 = require("../config/env");
const prisma_1 = require("../lib/prisma");
const tokens_1 = require("../lib/tokens");
const auth_1 = require("../middleware/auth");
exports.authRouter = (0, express_1.Router)();
const emailSchema = zod_1.z.string().trim().email().max(254).transform((email) => email.toLowerCase());
const passwordSchema = zod_1.z.string().min(12).max(128);
const authLimiter = (0, express_rate_limit_1.default)({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });
exports.authRouter.use(authLimiter);
function asyncRoute(handler) {
    return (req, res, next) => {
        handler(req, res).catch(next);
    };
}
function setRefreshCookie(res, token) {
    res.cookie("refreshToken", token, {
        httpOnly: true,
        secure: env_1.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/auth",
        maxAge: tokens_1.REFRESH_TOKEN_TTL_MS,
    });
}
async function issueSession(user, res) {
    const refreshToken = (0, tokens_1.createRefreshToken)();
    await prisma_1.prisma.refreshToken.create({
        data: {
            tokenHash: (0, tokens_1.hashToken)(refreshToken),
            userId: user.id,
            expiresAt: new Date(Date.now() + tokens_1.REFRESH_TOKEN_TTL_MS),
        },
    });
    setRefreshCookie(res, refreshToken);
    res.json({ accessToken: (0, tokens_1.createAccessToken)(user), tokenType: "Bearer", expiresIn: 900 });
}
exports.authRouter.post("/register", asyncRoute(async (req, res) => {
    const input = zod_1.z.object({ email: emailSchema, password: passwordSchema }).parse(req.body);
    const passwordHash = await bcryptjs_1.default.hash(input.password, 12);
    const freePlan = await prisma_1.prisma.plan.findUnique({ where: { slug: "free" } });
    if (!freePlan || !freePlan.active) {
        res.status(503).json({ error: "Free subscription plan is not configured" });
        return;
    }
    const user = await prisma_1.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
            data: { email: input.email, passwordHash },
            select: { id: true, role: true },
        });
        await tx.subscription.create({
            data: { userId: created.id, planId: freePlan.id, status: "ACTIVE" },
        });
        return created;
    });
    res.status(201);
    await issueSession(user, res);
}));
exports.authRouter.post("/login", asyncRoute(async (req, res) => {
    const input = zod_1.z.object({ email: emailSchema, password: zod_1.z.string().min(1).max(128) }).parse(req.body);
    const user = await prisma_1.prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !(await bcryptjs_1.default.compare(input.password, user.passwordHash))) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
    }
    if (user.status !== client_1.AccountStatus.ACTIVE) {
        res.status(403).json({ error: "This account has been suspended" });
        return;
    }
    await issueSession(user, res);
}));
exports.authRouter.post("/refresh", asyncRoute(async (req, res) => {
    const currentToken = req.cookies?.refreshToken;
    if (!currentToken) {
        res.status(401).json({ error: "Refresh token required" });
        return;
    }
    const currentHash = (0, tokens_1.hashToken)(currentToken);
    const stored = await prisma_1.prisma.refreshToken.findUnique({
        where: { tokenHash: currentHash },
        include: { user: { select: { id: true, role: true, status: true } } },
    });
    if (!stored || stored.expiresAt <= new Date() || stored.user.status !== client_1.AccountStatus.ACTIVE) {
        res.clearCookie("refreshToken", { path: "/api/auth" });
        res.status(401).json({ error: "Refresh token is invalid or expired" });
        return;
    }
    const replacement = (0, tokens_1.createRefreshToken)();
    const replacementExpiry = new Date(Date.now() + tokens_1.REFRESH_TOKEN_TTL_MS);
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.refreshToken.delete({ where: { id: stored.id } }),
        prisma_1.prisma.refreshToken.create({
            data: { tokenHash: (0, tokens_1.hashToken)(replacement), userId: stored.userId, expiresAt: replacementExpiry },
        }),
    ]);
    setRefreshCookie(res, replacement);
    res.json({
        accessToken: (0, tokens_1.createAccessToken)(stored.user),
        tokenType: "Bearer",
        expiresIn: 900,
    });
}));
exports.authRouter.post("/logout", asyncRoute(async (req, res) => {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
        await prisma_1.prisma.refreshToken.deleteMany({ where: { tokenHash: (0, tokens_1.hashToken)(refreshToken) } });
    }
    res.clearCookie("refreshToken", { path: "/api/auth" });
    res.status(204).end();
}));
exports.authRouter.post("/forgot-password", asyncRoute(async (req, res) => {
    const input = zod_1.z.object({ email: emailSchema }).parse(req.body);
    const user = await prisma_1.prisma.user.findUnique({ where: { email: input.email } });
    if (user) {
        const rawToken = (0, node_crypto_1.randomBytes)(32).toString("base64url");
        await prisma_1.prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
        await prisma_1.prisma.passwordResetToken.create({
            data: {
                tokenHash: (0, tokens_1.hashToken)(rawToken),
                userId: user.id,
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            },
        });
        if (env_1.env.NODE_ENV === "development") {
            console.info(`Password reset token for ${user.email}: ${rawToken}`);
        }
    }
    res.json({ message: "If the account exists, password reset instructions have been sent." });
}));
exports.authRouter.post("/reset-password", asyncRoute(async (req, res) => {
    const input = zod_1.z.object({ token: zod_1.z.string().min(20), password: passwordSchema }).parse(req.body);
    const token = await prisma_1.prisma.passwordResetToken.findUnique({
        where: { tokenHash: (0, tokens_1.hashToken)(input.token) },
    });
    if (!token || token.expiresAt <= new Date()) {
        res.status(400).json({ error: "Password reset token is invalid or expired" });
        return;
    }
    const passwordHash = await bcryptjs_1.default.hash(input.password, 12);
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.user.update({ where: { id: token.userId }, data: { passwordHash } }),
        prisma_1.prisma.passwordResetToken.deleteMany({ where: { userId: token.userId } }),
        prisma_1.prisma.refreshToken.deleteMany({ where: { userId: token.userId } }),
    ]);
    res.json({ message: "Password updated. Please log in again." });
}));
exports.authRouter.post("/change-password", auth_1.authenticate, asyncRoute(async (req, res) => {
    const input = zod_1.z.object({ currentPassword: zod_1.z.string().min(1), newPassword: passwordSchema }).parse(req.body);
    const user = await prisma_1.prisma.user.findUnique({ where: { id: req.auth.userId } });
    if (!user || !(await bcryptjs_1.default.compare(input.currentPassword, user.passwordHash))) {
        res.status(400).json({ error: "Current password is incorrect" });
        return;
    }
    const passwordHash = await bcryptjs_1.default.hash(input.newPassword, 12);
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
        prisma_1.prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
    ]);
    res.clearCookie("refreshToken", { path: "/api/auth" });
    res.json({ message: "Password updated. Please log in again." });
}));
