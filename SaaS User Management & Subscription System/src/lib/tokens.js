"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.REFRESH_TOKEN_TTL_MS = void 0;
exports.hashToken = hashToken;
exports.createRefreshToken = createRefreshToken;
exports.createAccessToken = createAccessToken;
exports.verifyAccessToken = verifyAccessToken;
const node_crypto_1 = require("node:crypto");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
exports.REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
function hashToken(token) {
    return (0, node_crypto_1.createHmac)("sha256", env_1.env.REFRESH_TOKEN_SECRET).update(token).digest("hex");
}
function createRefreshToken() {
    return (0, node_crypto_1.randomBytes)(48).toString("base64url");
}
function createAccessToken(user) {
    return jsonwebtoken_1.default.sign({ role: user.role }, env_1.env.ACCESS_TOKEN_SECRET, {
        subject: user.id,
        expiresIn: "15m",
        issuer: "saas-user-management",
        audience: "saas-api",
    });
}
function verifyAccessToken(token) {
    const payload = jsonwebtoken_1.default.verify(token, env_1.env.ACCESS_TOKEN_SECRET, {
        issuer: "saas-user-management",
        audience: "saas-api",
    });
    if (typeof payload === "string" || !payload.sub || typeof payload.role !== "string") {
        throw new Error("Invalid access token payload");
    }
    return { userId: payload.sub, role: payload.role };
}
