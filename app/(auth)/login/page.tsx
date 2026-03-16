"use client";

import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "admin") {
      router.replace("/dashboard");
    }
  }, [router, session?.user?.role, status]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setIsLoading(false);

    if (result?.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Logged in successfully.");
    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_20%_35%,rgba(63,101,151,.4),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(97,132,186,.25),transparent_40%),linear-gradient(130deg,#152947_0%,#1b3157_43%,#192f54_100%)] px-4">
      <Card className="w-full max-w-xl border-[#8cc9f399] shadow-[0_25px_80px_-45px_rgba(0,0,0,.95)]">
        <CardContent className="space-y-6 p-8">
          <div className="space-y-2 text-center">
            <h1 className="font-display text-4xl font-semibold text-white">Sign in to Disability</h1>
            <p className="text-base text-slate-300">Access your fitness center workspace</p>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="block space-y-2">
              <span className="flex items-center gap-2 text-2xl font-medium text-white">
                <Mail className="size-5" />
                Email address
              </span>
              <Input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="flex items-center gap-2 text-2xl font-medium text-white">
                <Lock className="size-5" />
                Password
              </span>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="******"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
            </label>

            <div className="text-right">
              <Link href="/forgot-password" className="text-sm text-[#8ccfff] hover:text-white">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
