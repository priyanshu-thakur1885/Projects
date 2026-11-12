"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const subscriptions_1 = require("../lib/subscriptions");
const auth_1 = require("../middleware/auth");
exports.userRouter = (0, express_1.Router)();
function asyncRoute(handler) {
    return (req, res, next) => {
        handler(req, res).catch(next);
    };
}
exports.userRouter.use(auth_1.authenticate);
exports.userRouter.get("/profile", asyncRoute(async (req, res) => {
    const subscription = await (0, subscriptions_1.getCurrentSubscription)(req.auth.userId);
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: req.auth.userId },
        select: {
            id: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
        },
    });
    res.json({ user: user ? { ...user, subscription } : null });
}));
exports.userRouter.get("/advanced-reports", (0, auth_1.requireFeature)("advanced_reports"), (_req, res) => {
    res.json({ message: "Advanced reports are available on your current plan." });
});
