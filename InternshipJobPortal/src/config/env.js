import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7)
}).superRefine((values, context) => {
  if (values.JWT_ACCESS_SECRET === values.JWT_REFRESH_SECRET) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["JWT_REFRESH_SECRET"],
      message: "Access and refresh token secrets must be different"
    });
  }
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid environment configuration:", parsedEnv.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  nodeEnv: parsedEnv.data.NODE_ENV,
  port: parsedEnv.data.PORT,
  mongoUri: parsedEnv.data.MONGODB_URI,
  accessSecret: parsedEnv.data.JWT_ACCESS_SECRET,
  refreshSecret: parsedEnv.data.JWT_REFRESH_SECRET,
  accessTokenTtl: parsedEnv.data.ACCESS_TOKEN_TTL,
  refreshTokenTtlDays: parsedEnv.data.REFRESH_TOKEN_TTL_DAYS
};
