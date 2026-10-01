"use client";

import { useState } from "react";
import { GraduationCap, Loader2, UserPlus } from "lucide-react";
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

export function RegisterView({ redirect }: { redirect?: string }) {
  const { register } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast({
        title: "كلمتا المرور غير متطابقتين",
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    try {
      const user = await register(name, email, password);
      toast({
        title: `أهلًا بك، ${user.name}!`,
        description: "تم إنشاء حسابك بنجاح — تقدمك سيُحفظ تلقائيًا من الآن.",
      });
      const back = redirect ? decodeURIComponent(redirect) : null;
      navigate(back ?? buildPath.courses());
    } catch (err) {
      toast({
        title: "تعذر إنشاء الحساب",
        description: err instanceof ApiError ? err.message : "حاول مرة أخرى",
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
          <CardTitle className="text-xl font-extrabold">إنشاء حساب جديد</CardTitle>
          <CardDescription>
            دقيقة واحدة ويصبح تقدمك محفوظًا تلقائيًا في كل كورس
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">الاسم</Label>
              <Input
                id="name"
                required
                minLength={2}
                autoComplete="name"
                placeholder="اسمك الكامل"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
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
                minLength={6}
                autoComplete="new-password"
                placeholder="6 أحرف على الأقل"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">تأكيد كلمة المرور</Label>
              <Input
                id="confirm"
                type="password"
                dir="ltr"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={busy}>
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <UserPlus className="size-4" />
              )}
              إنشاء الحساب
            </Button>
          </form>

          <p className="text-sm text-center text-muted-foreground mt-4">
            لديك حساب بالفعل؟{" "}
            <button
              type="button"
              className="text-primary font-semibold hover:underline"
              onClick={() => navigate(buildPath.login(redirect))}
            >
              سجّل الدخول
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
