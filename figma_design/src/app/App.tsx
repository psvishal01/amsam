import { useState } from "react";
import { SignInPage } from "./components/SignInPage";
import { GuestRegisterPage } from "./components/GuestRegisterPage";
import { StudentDashboard } from "./components/StudentDashboard";
import { AdminDashboard } from "./components/AdminDashboard";
import { SubAdminDashboard } from "./components/SubAdminDashboard";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";

type Page = "signin" | "guest-register" | "student" | "guest" | "admin" | "sub-admin";

interface User {
  name: string;
  role: "student" | "guest" | "admin" | "sub-admin";
}

export default function App() {
  const [page, setPage] = useState<Page>("signin");
  const [user, setUser] = useState<User | null>(null);

  const handleSignIn = (role: "student" | "admin" | "sub-admin" | "guest", name: string) => {
    setUser({ name, role });
    if (role === "admin") setPage("admin");
    else if (role === "sub-admin") setPage("sub-admin");
    else if (role === "guest") setPage("guest");
    else setPage("student");
    toast.success(`Welcome back, ${name.split(" ")[0]}!`, {
      description: `Signed in as ${role === "sub-admin" ? "Sub-Admin" : role.charAt(0).toUpperCase() + role.slice(1)}`,
    });
  };

  const handleGuestRegister = (name: string) => {
    setUser({ name, role: "guest" });
    setPage("guest");
    toast.success(`Account created! Welcome, ${name.split(" ")[0]}!`, {
      description: "You can now browse and register for public events.",
    });
  };

  const handleSignOut = () => {
    setUser(null);
    setPage("signin");
    toast("Signed out successfully");
  };

  return (
    <div className="w-full min-h-screen" style={{ fontFamily: "'Inter', 'Outfit', sans-serif" }}>
      {page === "signin" && (
        <SignInPage
          onSignIn={handleSignIn}
          onGuestRegister={() => setPage("guest-register")}
        />
      )}

      {page === "guest-register" && (
        <GuestRegisterPage
          onBack={() => setPage("signin")}
          onRegister={handleGuestRegister}
        />
      )}

      {(page === "student" || page === "guest") && user && (
        <StudentDashboard
          userName={user.name}
          userRole={page === "guest" ? "guest" : "student"}
          onSignOut={handleSignOut}
        />
      )}

      {page === "admin" && user && (
        <AdminDashboard
          adminName={user.name}
          onSignOut={handleSignOut}
        />
      )}

      {page === "sub-admin" && user && (
        <SubAdminDashboard
          adminName={user.name}
          onSignOut={handleSignOut}
        />
      )}

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#0C1F3D",
            color: "white",
            border: "1px solid rgba(13,148,136,0.3)",
            borderRadius: "12px",
          },
        }}
      />
    </div>
  );
}
