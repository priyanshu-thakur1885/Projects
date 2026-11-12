"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentSubscription = getCurrentSubscription;
const prisma_1 = require("./prisma");
async function getCurrentSubscription(userId) {
    const subscription = await prisma_1.prisma.subscription.findUnique({
        where: { userId },
        include: { plan: true },
    });
    if (!subscription ||
        subscription.status !== "ACTIVE" ||
        subscription.plan.slug === "free" ||
        !subscription.currentPeriodEnd ||
        subscription.currentPeriodEnd > new Date()) {
        return subscription;
    }
    const freePlan = await prisma_1.prisma.plan.findUnique({ where: { slug: "free" } });
    if (!freePlan || !freePlan.active) {
        throw new Error("Cannot expire subscription: active Free plan is not configured");
    }
    return prisma_1.prisma.subscription.update({
        where: { userId },
        data: { planId: freePlan.id, status: "ACTIVE", currentPeriodEnd: null },
        include: { plan: true },
    });
}
