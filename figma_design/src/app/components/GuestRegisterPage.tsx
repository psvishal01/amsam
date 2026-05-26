import { useState } from "react";
import { Stethoscope, Eye, EyeOff, Loader2, ArrowLeft, User, Phone, Mail, Building2, Lock } from "lucide-react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface GuestRegisterPageProps {
  onBack: () => void;
  onRegister: (name: string) => void;
}

export function GuestRegisterPage({ onBack, onRegister }: GuestRegisterPageProps) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    organization: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.phone.match(/^\+?[0-9]{10,13}$/)) newErrors.phone = "Enter a valid phone number";
    if (!form.email.includes("@")) newErrors.email = "Enter a valid email";
    if (!form.organization.trim()) newErrors.organization = "Organization is required";
    if (form.password.length < 8) newErrors.password = "Password must be at least 8 characters";
    if (form.password !== form.confirmPassword) newErrors.confirmPassword = "Passwords do not match";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onRegister(form.name);
    }, 1200);
  };

  const fieldConfig = [
    { key: "name", label: "Full Name", placeholder: "Dr. Jane Smith", icon: <User className="w-4 h-4" />, type: "text" },
    { key: "phone", label: "Phone Number", placeholder: "+91 98765 43210", icon: <Phone className="w-4 h-4" />, type: "tel" },
    { key: "email", label: "Email Address", placeholder: "jane@hospital.edu", icon: <Mail className="w-4 h-4" />, type: "email" },
    { key: "organization", label: "Institution / Organization", placeholder: "JIPMER, Puducherry", icon: <Building2 className="w-4 h-4" />, type: "text" },
  ];

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center relative overflow-hidden py-8"
      style={{
        background: "linear-gradient(135deg, #0C1F3D 0%, #1A3259 50%, #0D9488 100%)",
        fontFamily: "'Inter', 'Outfit', sans-serif",
      }}
    >
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-10" style={{ background: "#14B8A6" }} />
        <div className="absolute -bottom-40 -left-20 w-80 h-80 rounded-full opacity-10" style={{ background: "#F59E0B" }} />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 mb-6 transition-opacity hover:opacity-80"
          style={{ color: "rgba(255,255,255,0.7)", background: "none", border: "none", cursor: "pointer" }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span style={{ fontSize: "0.875rem" }}>Back to Sign In</span>
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3 shadow-xl"
            style={{ background: "linear-gradient(135deg, #F59E0B, #FBBF24)" }}
          >
            <Stethoscope className="w-8 h-8 text-white" />
          </div>
          <h1 style={{ color: "white", fontFamily: "'Outfit', sans-serif", fontSize: "1.75rem", fontWeight: 700, lineHeight: 1.2 }}>
            Guest Registration
          </h1>
          <p className="mt-1" style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.875rem" }}>
            Access public AMSAM events & activities
          </p>
        </div>

        {/* Form Card */}
        <div
          className="rounded-2xl p-6 shadow-2xl"
          style={{
            background: "rgba(255,255,255,0.07)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {fieldConfig.map(({ key, label, placeholder, icon, type }) => (
              <div key={key}>
                <Label style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.8rem" }}>
                  {label}
                </Label>
                <div className="relative mt-1">
                  <div
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    {icon}
                  </div>
                  <Input
                    type={type}
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder}
                    style={{
                      background: errors[key] ? "rgba(212,24,61,0.1)" : "rgba(255,255,255,0.1)",
                      border: errors[key] ? "1px solid rgba(212,24,61,0.5)" : "1px solid rgba(255,255,255,0.2)",
                      color: "white",
                      borderRadius: "0.75rem",
                      paddingLeft: "2.5rem",
                    }}
                  />
                </div>
                {errors[key] && (
                  <p style={{ color: "#f87171", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                    {errors[key]}
                  </p>
                )}
              </div>
            ))}

            {/* Password */}
            <div>
              <Label style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.8rem" }}>Password</Label>
              <div className="relative mt-1">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.4)" }} />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min. 8 characters"
                  style={{
                    background: errors.password ? "rgba(212,24,61,0.1)" : "rgba(255,255,255,0.1)",
                    border: errors.password ? "1px solid rgba(212,24,61,0.5)" : "1px solid rgba(255,255,255,0.2)",
                    color: "white",
                    borderRadius: "0.75rem",
                    paddingLeft: "2.5rem",
                    paddingRight: "2.5rem",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer" }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p style={{ color: "#f87171", fontSize: "0.75rem", marginTop: "0.25rem" }}>{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <Label style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.8rem" }}>Confirm Password</Label>
              <div className="relative mt-1">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.4)" }} />
                <Input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  placeholder="Re-enter password"
                  style={{
                    background: errors.confirmPassword ? "rgba(212,24,61,0.1)" : "rgba(255,255,255,0.1)",
                    border: errors.confirmPassword ? "1px solid rgba(212,24,61,0.5)" : "1px solid rgba(255,255,255,0.2)",
                    color: "white",
                    borderRadius: "0.75rem",
                    paddingLeft: "2.5rem",
                  }}
                />
              </div>
              {errors.confirmPassword && (
                <p style={{ color: "#f87171", fontSize: "0.75rem", marginTop: "0.25rem" }}>{errors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95 mt-2"
              style={{
                background: "linear-gradient(135deg, #F59E0B, #FBBF24)",
                color: "#0C1F3D",
                fontWeight: 700,
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Creating Account..." : "Create Guest Account"}
            </button>
          </form>

          <p className="text-center mt-4" style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem" }}>
            Already have an account?{" "}
            <button
              onClick={onBack}
              style={{ color: "#14B8A6", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
