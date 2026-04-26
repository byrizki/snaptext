import { loadEnvConfig } from "@next/env";
import { getDb, user, account } from "../db";
import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";

loadEnvConfig(process.cwd());

async function main() {
  const db = getDb();
  const email = "admin@snaptext.id";
  const oldEmail = "admin@snaptext.local";
  const password = "SnaptextAdmin123!";
  const name = "Admin";

  try {
    // 1. Cleanup old admin if exists
    console.log(`Cleaning up old admin user: ${oldEmail}...`);
    const oldUser = await db.query.user.findFirst({
      where: eq(user.email, oldEmail),
    });

    if (oldUser) {
      await db.delete(account).where(eq(account.userId, oldUser.id));
      await db.delete(user).where(eq(user.id, oldUser.id));
      console.log("Old admin user removed successfully.");
    } else {
      console.log("No old admin user found to cleanup.");
    }

    // 2. Seed/Update new admin
    console.log(`Checking if admin user exists: ${email}...`);
    
    const existingUser = await db.query.user.findFirst({
      where: eq(user.email, email),
    });

    let userId: string;

    if (!existingUser) {
      console.log("Creating new admin user...");
      userId = crypto.randomUUID();
      await db.insert(user).values({
        id: userId,
        name,
        email,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log("User record created.");
    } else {
      console.log("Admin user already exists.");
      userId = existingUser.id;
    }

    // Upsert the account (password)
    console.log("Upserting admin account credentials...");
    const hashedPassword = await hashPassword(password);
    
    const existingAccount = await db.query.account.findFirst({
      where: eq(account.userId, userId),
    });

    if (!existingAccount) {
      await db.insert(account).values({
        id: crypto.randomUUID(),
        userId,
        accountId: email,
        providerId: "email",
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log("Account record created.");
    } else {
      await db.update(account)
        .set({ 
          password: hashedPassword,
          updatedAt: new Date()
        })
        .where(eq(account.userId, userId));
      console.log("Account credentials updated.");
    }

    console.log("Admin seeded/updated successfully!");
  } catch (error) {
    console.error("Error seeding admin user:", error);
    process.exit(1);
  }
}

main();
