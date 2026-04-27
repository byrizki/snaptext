import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Sign Up — SnapText",
  description: "Create a free SnapText account and start extracting data from your documents.",
};

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
