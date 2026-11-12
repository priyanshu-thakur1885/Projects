"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
require("dotenv/config");
const prisma = new client_1.PrismaClient();
async function main() {
    const plans = [
        {
            name: "Free",
            slug: "free",
            priceCents: 0,
            interval: "monthly",
            features: ["profile", "basic_reports"],
        },
        {
            name: "Pro",
            slug: "pro",
            priceCents: 1900,
            interval: "monthly",
            features: ["profile", "basic_reports", "advanced_reports", "priority_support"],
        },
    ];
    for (const plan of plans) {
        await prisma.plan.upsert({
            where: { slug: plan.slug },
            update: plan,
            create: plan,
        });
    }
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminEmail && adminPassword) {
        const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
        if (!existing) {
            const passwordHash = await bcryptjs_1.default.hash(adminPassword, 12);
            await prisma.user.create({
                data: { email: adminEmail, passwordHash, role: client_1.UserRole.ADMIN },
            });
            console.info(`Created administrator account for ${adminEmail}`);
        }
        else {
            console.info(`Administrator email ${adminEmail} already exists; leaving its account unchanged`);
        }
    }
}
main()
    .catch((error) => {
    console.error("Database seed failed", error);
    process.exitCode = 1;
})
    .finally(async () => prisma.$disconnect());
