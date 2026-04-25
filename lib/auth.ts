import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
    database: drizzleAdapter(getDb(), {
        provider: "pg",
        schema: {
            ...schema
        }
    }),
    emailAndPassword: {
        enabled: true,
    },
});
