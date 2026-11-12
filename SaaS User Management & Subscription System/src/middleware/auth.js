"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.requireAdmin = requireAdmin;
exports.requireFeature = requireFeature;
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const subscriptions_1 = require("../lib/subscriptions");
const tokens_1 = require("../lib/tokens");
async function authenticate(req, res, next) {
    const authorization = req.header("authorization");
    if (!authorization?.startsWith("Bearer ")) {
        res.status(401).json({ error: "Authentication required" });
        return;
    }
    try {
        const identity = (0, tokens_1.verifyAccessToken)(authorization.slice(7));
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: identity.userId },
            select: { id: true, role: true, status: true },
        });
        if (!user || user.status !== client_1.AccountStatus.ACTIVE) {
            res.status(401).json({ error: "Account is unavailable" });
            return;
        }
        req.auth = { userId: user.id, role: user.role };
        next();
    }
    catch {
        res.status(401).json({ error: "Invalid or expired access token" });
    }
}
function requireAdmin(req, res, next) {
    if (req.auth?.role !== client_1.UserRole.ADMIN) {
        res.status(403).json({ error: "Administrator access required" });
        return;
    }
    next();
}
function requireFeature(feature) {
    return async (req, res, next) => {
        if (!req.auth) {
            res.status(401).json({ error: "Authentication required" });
            return;
        }
        const subscription = await (0, subscriptions_1.getCurrentSubscription)(req.auth.userId);
        if (!subscription ||
            subscription.status !== "ACTIVE" ||
            (subscription.currentPeriodEnd && subscription.currentPeriodEnd <= new Date()) ||
            !subscription.plan.active ||
            !subscription.plan.features.includes(feature)) {
            res.status(403).json({ error: "Your current plan does not include this feature", feature });
            return;
        }
        next();
    };
}
