import { auth } from "../lib/auth";

async function main() {
  try {
    const res = await auth.api.signUpEmail({
      body: {
        email: "admin@snaptext.local",
        password: "SnaptextAdmin123!",
        name: "Admin",
      }
    });
    console.log("Admin user seeded successfully:", res.user.email);
  } catch (error) {
    console.error("Error seeding admin user:", error);
  }
}

main();
