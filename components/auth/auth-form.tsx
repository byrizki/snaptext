"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn, signUp } from "@/lib/auth-client";
import { motion } from "framer-motion";

type AuthMode = "login" | "signup";

interface AuthFormProps {
  mode: AuthMode;
}

const GOOGLE_ICON = (
  <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const isSignup = mode === "signup";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isSignup) {
        const res = await signUp.email({ name, email, password });
        if (res.error) {
          setError(res.error.message ?? "Signup failed. Please try again.");
          return;
        }
        router.push("/dashboard");
      } else {
        const res = await signIn.email({ email, password });
        if (res.error) {
          setError(res.error.message ?? "Invalid credentials.");
          return;
        }
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      setError("An unexpected error occurred." + (err instanceof Error ? ` ${err.message}` : ""));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      await signIn.social({ provider: "google", callbackURL: "/dashboard" });
    } catch (err: unknown) {
      setError("Google sign-in failed." + (err instanceof Error ? ` ${err.message}` : ""));
      setGoogleLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md"
    >
      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-1/4 right-0 w-[300px] h-[300px] bg-violet-500/8 rounded-full blur-[100px] pointer-events-none -z-10" />

      <div className="rounded-[2rem] border border-zinc-200/60 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl shadow-2xl dark:shadow-[0_0_60px_rgba(0,0,0,0.4)] p-8 md:p-10">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1.5 text-sm">
            {isSignup
              ? "Start extracting insights from your documents."
              : "Sign in to your SnapText account."}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-sm text-red-600 dark:text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Google */}
        <button
          id={`${mode}-google-btn`}
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 h-11 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 text-sm font-medium text-zinc-700 dark:text-zinc-200 transition-all shadow-sm disabled:opacity-50 mb-5"
        >
          {googleLoading ? (
            <svg className="size-4 animate-spin text-zinc-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : GOOGLE_ICON}
          Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
          <span className="text-xs text-zinc-400 font-medium">or</span>
          <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="Alex Johnson"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full h-11 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-50 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-11 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-50 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full h-11 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-50 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            />
          </div>

          <button
            id={`${mode}-submit-btn`}
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading
              ? isSignup
                ? "Creating account..."
                : "Signing in..."
              : isSignup
              ? "Create Account"
              : "Sign In"}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 mt-6">
          {isSignup ? (
            <>
              Already have an account?{" "}
              <Link href="/login" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                Sign in
              </Link>
            </>
          ) : (
            <>
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                Sign up free
              </Link>
            </>
          )}
        </p>
      </div>
    </motion.div>
  );
}
