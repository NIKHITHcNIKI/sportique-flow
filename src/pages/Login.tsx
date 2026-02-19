import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { Dumbbell, LogIn } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      // Role-based redirect handled by App
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "").single();
      if (data?.role === "admin") navigate("/admin");
      else navigate("/student");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary p-4 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 w-40 h-40 rounded-full border-4 border-primary" />
        <div className="absolute bottom-20 right-20 w-60 h-60 rounded-full border-4 border-primary" />
        <div className="absolute top-1/2 left-1/3 w-32 h-32 rounded-full border-4 border-primary" />
      </div>

      <Card className="w-full max-w-md border-0 shadow-2xl bg-card relative z-10">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
            <Dumbbell className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-4xl text-secondary">SPORTS EQUIP</CardTitle>
          <CardDescription className="text-muted-foreground text-base">
            Equipment Management System
          </CardDescription>
        </CardHeader>
        <CardContent>
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
            <Button type="submit" disabled={loading} className="w-full h-12 text-lg font-semibold gap-2">
              <LogIn className="h-5 w-5" />
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <p className="text-center mt-6 text-muted-foreground">
            Don't have an account?{" "}
            <button onClick={() => navigate("/register")} className="text-primary font-semibold hover:underline">
              Register here
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
