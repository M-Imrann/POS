import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn } from "lucide-react";
import { toast } from "sonner";
import { auth } from "@/lib/api";

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) toast.error(error);
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) { toast.error("Please enter your email"); return; }
    setResetLoading(true);
    try {
      await auth.forgotPassword(resetEmail);
      toast.success("If that email exists, a reset link has been sent.");
      setShowForgot(false);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to send reset email");
    }
    setResetLoading(false);
  };

  if (showForgot) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm space-y-8 animate-slide-up">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-primary">StockFlow</h1>
            <p className="text-muted-foreground text-sm mt-2">Reset your password</p>
          </div>
          <form onSubmit={handleResetPassword} className="glass-card-elevated p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="you@company.com"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={resetLoading}>
              {resetLoading ? "Sending..." : "Send Reset Link"}
            </Button>
            <button
              type="button"
              onClick={() => setShowForgot(false)}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to sign in
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-8 animate-slide-up">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">StockFlow</h1>
          <p className="text-muted-foreground text-sm mt-2">Sign in to manage your inventory</p>
        </div>
        <form onSubmit={handleSubmit} className="glass-card-elevated p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <Button type="submit" className="w-full gap-2" disabled={loading}>
            <LogIn className="w-4 h-4" />
            {loading ? "Signing in..." : "Sign In"}
          </Button>
          <button
            type="button"
            onClick={() => { setShowForgot(true); setResetEmail(email); }}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Forgot password?
          </button>
        </form>
        <p className="text-xs text-center text-muted-foreground">
          Contact your administrator for account access
        </p>
      </div>
    </div>
  );
}
