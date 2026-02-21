import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { Dumbbell, LogIn, Shield, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

const ADMIN_EMAIL = "scttmk@admin.sports";
const ADMIN_PASSWORD = "scttmk1086sct";
const ADMIN_NAME = "scttmk";

type Tab = "student" | "admin";

const Login = () => {
  const [tab, setTab] = useState<Tab>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const attemptAdminLogin = async () => {
    if (adminName === ADMIN_NAME && adminPass === ADMIN_PASSWORD) {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      });
      setLoading(false);
      if (error) {
        toast.error(error.message);
      } else {
        navigate("/admin");
      }
    } else {
      toast.error("Invalid admin credentials");
    }
  };

  const handleAdminNameChange = (val: string) => {
    setAdminName(val);
    // Check after state update via timeout
    setTimeout(() => {
      if (val === ADMIN_NAME && adminPass === ADMIN_PASSWORD) {
        attemptAdminLogin();
      }
    }, 0);
  };

  const handleAdminPassChange = (val: string) => {
    setAdminPass(val);
    setTimeout(() => {
      if (adminName === ADMIN_NAME && val === ADMIN_PASSWORD) {
        attemptAdminLogin();
      }
    }, 0);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "")
        .single();
      if (data?.role === "admin") navigate("/admin");
      else navigate("/student");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-10 left-10 w-40 h-40 rounded-full border-4 border-primary" />
        <div className="absolute bottom-20 right-20 w-60 h-60 rounded-full border-4 border-primary" />
        <div className="absolute top-1/2 left-1/3 w-32 h-32 rounded-full border-4 border-primary" />
      </div>

      <Card className="w-full max-w-md border-0 shadow-2xl bg-card relative z-10">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
            <Dumbbell className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-4xl text-secondary tracking-widest" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            SPORTS EQUIP
          </CardTitle>
          <CardDescription className="text-muted-foreground text-base">
            Equipment Management System
          </CardDescription>
        </CardHeader>

        {/* Tab switcher */}
        <div className="px-6 pb-2">
          <div className="flex rounded-xl overflow-hidden border border-border bg-muted p-1 gap-1">
            <button
              onClick={() => setTab("student")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200",
                tab === "student"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <GraduationCap className="h-4 w-4" />
              Student
            </button>
            <button
              onClick={() => setTab("admin")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200",
                tab === "admin"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Shield className="h-4 w-4" />
              Admin
            </button>
          </div>
        </div>

        <CardContent className="pt-4">
          {/* ADMIN TAB */}
          {tab === "admin" && (
            <div className="space-y-4">
              <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 text-center space-y-1">
                <Shield className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="font-bold text-foreground text-lg">Admin Access</p>
                <p className="text-muted-foreground text-sm">
                  Enter admin credentials to sign in automatically
                </p>
              </div>
              <div>
                <Input
                  type="text"
                  placeholder="Admin Name"
                  value={adminName}
                  onChange={(e) => handleAdminNameChange(e.target.value)}
                  className="h-12 text-base"
                />
              </div>
              <div>
                <Input
                  type="password"
                  placeholder="Admin Password"
                  value={adminPass}
                  onChange={(e) => handleAdminPassChange(e.target.value)}
                  className="h-12 text-base"
                />
              </div>
              <Button
                onClick={attemptAdminLogin}
                disabled={loading || !adminName || !adminPass}
                className="w-full h-12 text-lg font-semibold gap-2"
              >
                <LogIn className="h-5 w-5" />
                {loading ? "Signing in..." : "Sign In as Admin"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Admin access is restricted. Contact your system administrator for issues.
              </p>
            </div>
          )}

          {/* STUDENT TAB */}
          {tab === "student" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 text-base"
                />
              </div>
              <div>
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 text-base"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-lg font-semibold gap-2"
              >
                <LogIn className="h-5 w-5" />
                {loading ? "Signing in..." : "Sign In"}
              </Button>
              <p className="text-center mt-2 text-muted-foreground">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/register")}
                  className="text-primary font-semibold hover:underline"
                >
                  Register here
                </button>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
