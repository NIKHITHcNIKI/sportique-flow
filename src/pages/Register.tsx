import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { Dumbbell, UserPlus } from "lucide-react";

const Register = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fullName.trim().length === 0 || fullName.length > 100) { toast.error("Full name must be 1-100 characters"); return; }
    if (phone && (phone.length > 20 || !/^[0-9+\-() ]*$/.test(phone))) { toast.error("Invalid phone number format"); return; }
    if (department && department.length > 100) { toast.error("Department must be under 100 characters"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone.trim() || null,
          department: department.trim() || null,
        },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Registration successful! Please check your email to verify your account.");
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 right-10 w-40 h-40 rounded-full border-4 border-primary" />
        <div className="absolute bottom-10 left-10 w-60 h-60 rounded-full border-4 border-primary" />
      </div>

      <Card className="w-full max-w-md border-0 shadow-2xl bg-card relative z-10">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
            <Dumbbell className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-4xl text-secondary">REGISTER</CardTitle>
          <CardDescription className="text-base">Create your student account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-3">
            <Input placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="h-11" maxLength={100} />
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" maxLength={255} />
            <Input type="password" placeholder="Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="h-11" maxLength={128} />
            <Input placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11" maxLength={20} />
            <Input placeholder="Department (optional)" value={department} onChange={(e) => setDepartment(e.target.value)} className="h-11" maxLength={100} />
            <Button type="submit" disabled={loading} className="w-full h-12 text-lg font-semibold gap-2">
              <UserPlus className="h-5 w-5" />
              {loading ? "Creating account..." : "Register"}
            </Button>
          </form>
          <p className="text-center mt-6 text-muted-foreground">
            Already have an account?{" "}
            <button onClick={() => navigate("/login")} className="text-primary font-semibold hover:underline">
              Sign in
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
