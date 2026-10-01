"use client";

import { useState } from "react";
import { GraduationCap, Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ApiError, useAuth } from "@/lib/client";
import { buildPath, navigate } from "@/lib/router";

export function LoginView({ redirect }: { redirect?: string }) {
  const { login } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const afterAuth = () => {
    const back = redirect ? decodeURIComponent(redirect) : null;
    navigate(back ?? buildPath.dashboard());
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setBusy(true);
    try {
      const user = await login(email, password);
      toast({ title: `أهلًا بعودتك، ${user.name.split(" ")[0]}!` });
      afterAuth();
    } catch (err) {
      toast({
        title: "تعذر تسجيل الدخول",
        description: err instanceof ApiError ? err.message : "تحقق من البيانات وحاول مجددًا",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <span className="mx-auto flex items-center justify-center size-12 rounded-2xl bg-primary text-primary-foreground">
            <GraduationCap className="size-6" />
          </span>
          <CardTitle className="text-xl font-extrabold">تسجيل الدخول</CardTitle>
          <CardDescription>
            سجّل الدخول لمتابعة تعلمك وحفظ تقدمك تلقائيًا
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                dir="ltr"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                dir="ltr"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
              دخول
            </Button>
          </form>

          <p className="text-sm text-center text-muted-foreground mt-4">
            لا تملك حسابًا؟{" "}
            <button
              type="button"
              className="text-primary font-semibold hover:underline"
              onClick={() => navigate(buildPath.register(redirect))}
            >
              أنشئ حسابًا جديدًا
            </button>
          </p>

          <div className="mt-6 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">حسابات تجريبية:</p>
            <p dir="ltr" className="text-start">admin@drd.edu / Admin@123 (مدير)</p>
            <p dir="ltr" className="text-start">student@drd.edu / Student@123 (طالب)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
