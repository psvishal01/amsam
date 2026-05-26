import { useState } from "react";
import { Stethoscope, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

type Role = "student" | "admin" | "sub-admin" | "guest";

interface SignInPageProps {
  onSignIn: (role: Role, name: string) => void;
  onGuestRegister: () => void;
}

const demoRoles: { role: Role; label: string; email: string; color: string }[] = [
  { role: "student", label: "Student", email: "student@aiims.edu", color: "bg-[#0D9488]" },
  { role: "admin", label: "Super Admin", email: "admin@aiims.edu", color: "bg-[#0C1F3D]" },
  { role: "sub-admin", label: "Sub-Admin", email: "subadmin@aiims.edu", color: "bg-[#1A3259]" },
  { role: "guest", label: "Guest", email: "guest@example.com", color: "bg-[#F59E0B]" },
];

export function SignInPage({ onSignIn, onGuestRegister }: SignInPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDemoLogin = (role: Role, label: string) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const names: Record<Role, string> = {
        student: "Dr. Arjun Sharma",
        admin: "Prof. Meera Nair",
        "sub-admin": "Dr. Rahul Singh",
        guest: "Priya Menon",
      };
      onSignIn(role, names[role]);
    }, 800);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onSignIn("student", "Dr. Arjun Sharma");
    }, 1000);
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0C1F3D 0%, #1A3259 40%, #0D9488 100%)",
        fontFamily: "'Inter', 'Outfit', sans-serif",
      }}
    >
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-10"
          style={{ background: "#14B8A6" }}
        />
        <div
          className="absolute -bottom-40 -left-20 w-80 h-80 rounded-full opacity-10"
          style={{ background: "#F59E0B" }}
        />
        <div
          className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full opacity-5"
          style={{ background: "#ffffff" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 shadow-2xl"
            style={{ background: "linear-gradient(135deg, #0D9488, #14B8A6)" }}>
            <Stethoscope className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-white" style={{ fontFamily: "'Outfit', sans-serif", fontSize: "2rem", fontWeight: 700, lineHeight: 1.2 }}>
            AMSAM Portal
          </h1>
          <p className="mt-1" style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.9rem" }}>
            Association of Medical Students · AIIMS Mangalagiri
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8 shadow-2xl"
          style={{
            background: "rgba(255,255,255,0.07)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          <h2 style={{ color: "white", fontSize: "1.25rem", fontWeight: 600, marginBottom: "1.5rem" }}>
            Sign In
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.875rem" }}>
                Email Address
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@aiims.edu"
                className="mt-1"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "white",
                  borderRadius: "0.75rem",
                }}
              />
            </div>
            <div>
              <Label style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.875rem" }}>
                Password
              </Label>
              <div className="relative mt-1">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "white",
                    borderRadius: "0.75rem",
                    paddingRight: "2.5rem",
                  }}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #0D9488, #14B8A6)",
                color: "white",
                fontWeight: 600,
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1" style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }} />
            <span className="px-3" style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>
              Quick Demo Access
            </span>
            <div className="flex-1" style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }} />
          </div>

          {/* Demo role buttons */}
          <div className="grid grid-cols-2 gap-2">
            {demoRoles.map(({ role, label, color }) => (
              <button
                key={role}
                onClick={() => handleDemoLogin(role, label)}
                disabled={loading}
                className={`${color} py-2.5 px-4 rounded-xl flex items-center gap-2 transition-all hover:opacity-90 active:scale-95`}
                style={{ color: "white", fontSize: "0.8rem", fontWeight: 500, border: "none", cursor: "pointer" }}
              >
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                {label}
              </button>
            ))}
          </div>

          {/* Guest link */}
          <div className="text-center mt-6">
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.875rem" }}>
              External user?{" "}
              <button
                onClick={onGuestRegister}
                className="underline underline-offset-2 transition-colors hover:opacity-80"
                style={{ color: "#FBBF24", background: "none", border: "none", cursor: "pointer" }}
              >
                Create a Guest Account
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center mt-6" style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem" }}>
          © 2026 AMSAM · AIIMS Mangalagiri · All Rights Reserved
        </p>
      </div>
    </div>
  );
}
