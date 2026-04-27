import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Sign In — SnapText",
  description: "Sign in to your SnapText account to manage your document scans.",
};

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
