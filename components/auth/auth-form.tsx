"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { signIn, signUp, useSession } from "@/lib/auth-client";

const GOOGLE_ICON = (
  <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

type AuthMode = "login" | "signup";

interface AuthFormProps {
  mode: AuthMode;
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const isSignup = mode === "signup";

  useEffect(() => {
    if (session?.user) {
      router.replace("/dashboard");
    }
  }, [router, session?.user]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isSignup) {
        const res = await signUp.email({ name, email, password });
        if (res.error) {
          setError(res.error.message ?? "Signup failed. Please try again.");
          return;
        }
      } else {
        const res = await signIn.email({ email, password });
        if (res.error) {
          setError(res.error.message ?? "Invalid credentials.");
          return;
        }
      }
      router.replace("/dashboard");
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

  if (isPending || session?.user) {
    return (
      <Card className="w-full max-w-md border-primary/15 bg-card/85 shadow-[0_0_70px_rgba(59,130,246,0.14)] backdrop-blur-xl">
        <CardContent className="space-y-4">
          <Skeleton className="mx-auto size-12 rounded-2xl" />
          <Skeleton className="mx-auto h-7 w-48" />
          <Skeleton className="h-11 w-full rounded-full" />
          <Skeleton className="h-11 w-full rounded-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-md"
    >
      <Card className="border-primary/15 bg-card/85 shadow-[0_0_70px_rgba(59,130,246,0.14)] backdrop-blur-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-lg font-semibold text-primary">
            ST
          </div>
          <CardTitle className="text-2xl font-semibold tracking-[-0.04em]">
            {isSignup ? "Create your account" : "Sign in to SnapText"}
          </CardTitle>
          <CardDescription>
            {isSignup ? "Start with a free document scan." : "Open your scans, models, and API keys."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error ? (
            <Alert variant="destructive" className="mb-5">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Button
            id={`${mode}-google-btn`}
            type="button"
            variant="outline"
            size="lg"
            onClick={handleGoogle}
            disabled={googleLoading}
            className="mb-5 h-11 w-full gap-3 bg-background/70"
          >
            {googleLoading ? <span className="size-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" /> : GOOGLE_ICON}
            Continue with Google
          </Button>

          <div className="mb-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup ? (
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Alex Johnson"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  className="h-11 bg-background/70 px-4"
                />
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="h-11 bg-background/70 px-4"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                placeholder="At least 8 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                className="h-11 bg-background/70 px-4"
              />
            </div>

            <Button id={`${mode}-submit-btn`} type="submit" size="lg" disabled={loading} className="h-11 w-full">
              {loading ? (isSignup ? "Creating account..." : "Signing in...") : isSignup ? "Create account" : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignup ? (
              <>
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
                  Sign in
                </Link>
              </>
            ) : (
              <>
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="font-semibold text-primary underline-offset-4 hover:underline">
                  Sign up free
                </Link>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
