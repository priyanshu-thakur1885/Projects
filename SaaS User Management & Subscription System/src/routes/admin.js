"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRouter = void 0;
const client_1 = require("@prisma/client");
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
exports.adminRouter = (0, express_1.Router)();
function asyncRoute(handler) {
    return (req, res, next) => {
        handler(req, res).catch(next);
    };
}
exports.adminRouter.use(auth_1.authenticate, auth_1.requireAdmin);
exports.adminRouter.get("/users", asyncRoute(async (req, res) => {
    const query = zod_1.z
        .object({
        page: zod_1.z.coerce.number().int().positive().default(1),
        limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
        search: zod_1.z.string().trim().max(254).optional(),
    })
        .parse(req.query);
    const where = query.search ? { email: { contains: query.search, mode: "insensitive" } } : {};
    const [users, total] = await prisma_1.prisma.$transaction([
        prisma_1.prisma.user.findMany({
            where,
            select: {
                id: true,
                email: true,
                role: true,
                status: true,
                createdAt: true,
                subscription: { select: { status: true, currentPeriodEnd: true, plan: { select: { name: true, slug: true } } } },
            },
            orderBy: { createdAt: "desc" },
            skip: (query.page - 1) * query.limit,
            take: query.limit,
        }),
        prisma_1.prisma.user.count({ where }),
    ]);
    res.json({ users, pagination: { page: query.page, limit: query.limit, total } });
}));
exports.adminRouter.patch("/users/:userId/plan", asyncRoute(async (req, res) => {
    const input = zod_1.z.object({ planSlug: zod_1.z.string().min(1).max(50) }).parse(req.body);
    const plan = await prisma_1.prisma.plan.findFirst({ where: { slug: input.planSlug, active: true } });
    if (!plan) {
        res.status(404).json({ error: "Plan not found" });
        return;
    }
    const user = await prisma_1.prisma.user.findUnique({ where: { id: req.params.userId }, select: { id: true } });
    if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
    }
    const subscription = await prisma_1.prisma.subscription.upsert({
        where: { userId: user.id },
        create: {
            userId: user.id,
            planId: plan.id,
            status: "ACTIVE",
            currentPeriodEnd: plan.slug === "free" ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        update: {
            planId: plan.id,
            status: "ACTIVE",
            currentPeriodEnd: plan.slug === "free" ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        include: { plan: true },
    });
    res.json({ subscription });
}));
exports.adminRouter.patch("/users/:userId/suspension", asyncRoute(async (req, res) => {
    const input = zod_1.z.object({ suspended: zod_1.z.boolean() }).parse(req.body);
    if (req.params.userId === req.auth.userId && input.suspended) {
        res.status(400).json({ error: "You cannot suspend your own administrator account" });
        return;
    }
    const user = await prisma_1.prisma.user.findUnique({ where: { id: req.params.userId } });
    if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
    }
    const updated = await prisma_1.prisma.user.update({
        where: { id: user.id },
        data: { status: input.suspended ? client_1.AccountStatus.SUSPENDED : client_1.AccountStatus.ACTIVE },
        select: { id: true, email: true, role: true, status: true },
    });
    if (input.suspended) {
        await prisma_1.prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    }
    res.json({ user: updated });
}));
exports.adminRouter.get("/summary", asyncRoute(async (_req, res) => {
    const [totalUsers, activeUsers, paidSubscriptions] = await Promise.all([
        prisma_1.prisma.user.count(),
        prisma_1.prisma.user.count({ where: { status: client_1.AccountStatus.ACTIVE, role: client_1.UserRole.USER } }),
        prisma_1.prisma.subscription.count({
            where: { status: "ACTIVE", plan: { priceCents: { gt: 0 } } },
        }),
    ]);
    res.json({ totalUsers, activeUsers, paidSubscriptions });
}));
