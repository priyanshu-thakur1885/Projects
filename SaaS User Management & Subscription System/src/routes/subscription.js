"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscriptionRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const subscriptions_1 = require("../lib/subscriptions");
const auth_1 = require("../middleware/auth");
exports.subscriptionRouter = (0, express_1.Router)();
function asyncRoute(handler) {
    return (req, res, next) => {
        handler(req, res).catch(next);
    };
}
exports.subscriptionRouter.get("/plans", asyncRoute(async (_req, res) => {
    const plans = await prisma_1.prisma.plan.findMany({
        where: { active: true },
        select: { id: true, name: true, slug: true, priceCents: true, interval: true, features: true },
        orderBy: { priceCents: "asc" },
    });
    res.json({ plans });
}));
exports.subscriptionRouter.get("/me", auth_1.authenticate, asyncRoute(async (req, res) => {
    res.json({ subscription: await (0, subscriptions_1.getCurrentSubscription)(req.auth.userId) });
}));
exports.subscriptionRouter.post("/upgrade", auth_1.authenticate, asyncRoute(async (req, res) => {
    const input = zod_1.z.object({ planSlug: zod_1.z.string().min(1).max(50) }).parse(req.body);
    const plan = await prisma_1.prisma.plan.findFirst({
        where: { slug: input.planSlug, active: true },
    });
    if (!plan) {
        res.status(404).json({ error: "Plan not found" });
        return;
    }
    if (plan.slug === "free" || plan.priceCents <= 0) {
        res.status(400).json({ error: "Choose a paid plan to upgrade" });
        return;
    }
    const subscription = await prisma_1.prisma.subscription.upsert({
        where: { userId: req.auth.userId },
        create: {
            userId: req.auth.userId,
            planId: plan.id,
            status: "ACTIVE",
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        update: {
            planId: plan.id,
            status: "ACTIVE",
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        include: { plan: true },
    });
    res.json({
        subscription,
        notice: "Demo upgrade activated; connect a payment provider before accepting real payments.",
    });
}));
