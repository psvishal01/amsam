import { useState } from "react";
import {
  CreditCard, Calendar, FileText, Bell, LogOut, CheckCircle2,
  MapPin, Clock, Users, Download, ChevronRight, Star, Wifi,
  QrCode, Share2, Shield
} from "lucide-react";

interface StudentDashboardProps {
  userName: string;
  userRole: "student" | "guest";
  onSignOut: () => void;
}

type Tab = "id" | "events" | "docs";

const mockEvents = [
  {
    id: 1,
    title: "Annual Medical Symposium 2026",
    date: "June 15, 2026",
    time: "9:00 AM – 5:00 PM",
    venue: "Main Auditorium, AIIMS Mangalagiri",
    fee: "Free for Members",
    feeGuest: "₹200",
    type: "Symposium",
    capacity: 300,
    registered: 248,
    visibility: "public",
    tag: "Flagship",
    tagColor: "#F59E0B",
    registered_by_user: true,
  },
  {
    id: 2,
    title: "Workshop: Clinical Skills & OSCE Prep",
    date: "June 22, 2026",
    time: "2:00 PM – 6:00 PM",
    venue: "Simulation Lab, Block C",
    fee: "₹150",
    feeGuest: "₹350",
    type: "Workshop",
    capacity: 40,
    registered: 38,
    visibility: "members",
    tag: "Members Only",
    tagColor: "#0D9488",
    registered_by_user: false,
  },
  {
    id: 3,
    title: "Blood Donation Drive",
    date: "July 1, 2026",
    time: "8:00 AM – 2:00 PM",
    venue: "OPD Complex, Ground Floor",
    fee: "Free",
    feeGuest: "Free",
    type: "Social",
    capacity: 500,
    registered: 120,
    visibility: "public",
    tag: "Open",
    tagColor: "#6366F1",
    registered_by_user: false,
  },
  {
    id: 4,
    title: "Research Methodology Bootcamp",
    date: "July 10–12, 2026",
    time: "9:00 AM – 1:00 PM",
    venue: "Conference Room 1, Academic Block",
    fee: "₹500",
    feeGuest: "₹800",
    type: "Course",
    capacity: 60,
    registered: 42,
    visibility: "members",
    tag: "Members Only",
    tagColor: "#0D9488",
    registered_by_user: false,
  },
];

const mockDocs = [
  { id: 1, title: "Minutes of General Body Meeting – May 2026", date: "May 20, 2026", type: "MoM", size: "420 KB" },
  { id: 2, title: "AMSAM Constitution & Bylaws (Revised 2026)", date: "Jan 10, 2026", type: "Constitution", size: "1.2 MB" },
  { id: 3, title: "Annual Report 2025–26", date: "Apr 30, 2026", type: "Report", size: "3.8 MB" },
  { id: 4, title: "Minutes of Executive Meeting – April 2026", date: "Apr 18, 2026", type: "MoM", size: "310 KB" },
  { id: 5, title: "Event Guidelines & Code of Conduct", date: "Mar 1, 2026", type: "Policy", size: "580 KB" },
];

function QRCodeSVG({ value }: { value: string }) {
  const seed = value.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const cells = 21;
  const grid: boolean[][] = Array.from({ length: cells }, (_, r) =>
    Array.from({ length: cells }, (_, c) => {
      if (r < 7 && c < 7) return (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
      if (r < 7 && c >= cells - 7) return (r === 0 || r === 6 || c === cells - 7 || c === cells - 1 || (r >= 2 && r <= 4 && c >= cells - 5 && c <= cells - 3));
      if (r >= cells - 7 && c < 7) return (r === cells - 7 || r === cells - 1 || c === 0 || c === 6 || (r >= cells - 5 && r <= cells - 3 && c >= 2 && c <= 4));
      return ((seed * (r + 1) * (c + 1) + r * 3 + c * 7) % 3) === 0;
    })
  );

  const size = 160;
  const cellSize = size / cells;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg">
      <rect width={size} height={size} fill="white" rx="4" />
      {grid.map((row, r) =>
        row.map((filled, c) =>
          filled ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize}
              height={cellSize}
              fill="#0C1F3D"
            />
          ) : null
        )
      )}
    </svg>
  );
}

function DigitalIDCard({ userName, userRole }: { userName: string; userRole: "student" | "guest" }) {
  const [flipped, setFlipped] = useState(false);
  const isStudent = userRole === "student";
  const initials = userName.split(" ").filter(w => w.match(/[A-Z]/)).map(w => w[0]).join("").slice(0, 2);
  const rollNumber = "AIIMS/MBBS/2024/089";
  const year = "3rd Year MBBS";
  const validity = "Dec 31, 2026";

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="cursor-pointer w-full max-w-sm"
        style={{ perspective: "1000px" }}
        onClick={() => setFlipped(!flipped)}
      >
        <div
          className="relative w-full"
          style={{
            transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            height: "220px",
          }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl"
            style={{
              backfaceVisibility: "hidden",
              background: "linear-gradient(135deg, #0C1F3D 0%, #1A3259 60%, #0D9488 100%)",
            }}
          >
            {/* Decorative circles */}
            <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10" style={{ background: "#14B8A6" }} />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-10" style={{ background: "#F59E0B" }} />
            <div className="absolute top-0 left-0 w-full h-1" style={{ background: "linear-gradient(90deg, #F59E0B, #FBBF24, #0D9488)" }} />

            <div className="relative p-5 flex flex-col h-full justify-between">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "#0D9488" }}>
                      <Shield className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span style={{ color: "#14B8A6", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em" }}>AMSAM · AIIMS MANGALAGIRI</span>
                  </div>
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.6rem", letterSpacing: "0.05em" }}>
                    {isStudent ? "STUDENT MEMBERSHIP CARD" : "GUEST MEMBERSHIP CARD"}
                  </p>
                </div>
                <div
                  className="px-2 py-0.5 rounded-full"
                  style={{ background: isStudent ? "rgba(13,148,136,0.3)" : "rgba(245,158,11,0.3)", border: `1px solid ${isStudent ? "#0D9488" : "#F59E0B"}` }}
                >
                  <span style={{ color: isStudent ? "#14B8A6" : "#FBBF24", fontSize: "0.6rem", fontWeight: 600 }}>
                    {isStudent ? "ACTIVE" : "GUEST"}
                  </span>
                </div>
              </div>

              {/* User info */}
              <div className="flex items-end justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
                    style={{ background: "linear-gradient(135deg, #0D9488, #14B8A6)", fontSize: "1.25rem", color: "white", fontWeight: 700 }}
                  >
                    {initials || "?"}
                  </div>
                  <div>
                    <p style={{ color: "white", fontWeight: 700, fontSize: "1rem", lineHeight: 1.2 }}>{userName}</p>
                    {isStudent ? (
                      <>
                        <p style={{ color: "#14B8A6", fontSize: "0.7rem", marginTop: "2px" }}>{year}</p>
                        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.65rem" }}>{rollNumber}</p>
                      </>
                    ) : (
                      <p style={{ color: "#FBBF24", fontSize: "0.7rem", marginTop: "2px" }}>External Participant</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Wifi className="w-4 h-4" style={{ color: "#14B8A6" }} />
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.55rem" }}>Valid till</p>
                  <p style={{ color: "#F59E0B", fontSize: "0.65rem", fontWeight: 600 }}>{validity}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center justify-center"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              background: "linear-gradient(135deg, #F8FAFC 0%, #E8EDF8 100%)",
            }}
          >
            <div className="absolute top-0 left-0 w-full h-1" style={{ background: "linear-gradient(90deg, #0C1F3D, #0D9488, #F59E0B)" }} />
            <div className="flex flex-col items-center gap-3 p-4">
              <p style={{ color: "#0C1F3D", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.08em" }}>SCAN TO VERIFY</p>
              <div className="p-2 rounded-xl shadow-md" style={{ background: "white", border: "2px solid #0C1F3D" }}>
                <QRCodeSVG value={`amsam-${rollNumber}-${userName}`} />
              </div>
              <p style={{ color: "#717182", fontSize: "0.65rem" }}>ID: {isStudent ? rollNumber : "GUEST-2024-089"}</p>
            </div>
          </div>
        </div>
      </div>

      <p style={{ color: "#717182", fontSize: "0.75rem" }}>Tap the card to reveal QR code</p>

      <div className="flex gap-2">
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all hover:opacity-80"
          style={{ background: "#0C1F3D", color: "white", border: "none", cursor: "pointer", fontSize: "0.8rem" }}
        >
          <Share2 className="w-3.5 h-3.5" />
          Share
        </button>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all hover:opacity-80"
          style={{ background: "#F0F4FF", color: "#0C1F3D", border: "1px solid #E8EDF8", cursor: "pointer", fontSize: "0.8rem" }}
        >
          <Download className="w-3.5 h-3.5" />
          Download
        </button>
      </div>
    </div>
  );
}

function EventCard({ event, isGuest }: { event: typeof mockEvents[0]; isGuest: boolean }) {
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState(event.registered_by_user);
  const fillPercent = Math.round((event.registered / event.capacity) * 100);
  const fee = isGuest ? event.feeGuest : event.fee;

  const handleRegister = () => {
    if (registered) return;
    setRegistering(true);
    setTimeout(() => {
      setRegistering(false);
      setRegistered(true);
    }, 800);
  };

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-md transition-all hover:shadow-lg"
      style={{ background: "white", border: "1px solid #E8EDF8" }}
    >
      <div className="h-1.5" style={{ background: `linear-gradient(90deg, #0C1F3D, #0D9488)` }} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="px-2 py-0.5 rounded-full"
                style={{ background: `${event.tagColor}20`, color: event.tagColor, fontSize: "0.65rem", fontWeight: 600 }}
              >
                {event.tag}
              </span>
              <span style={{ color: "#717182", fontSize: "0.7rem" }}>{event.type}</span>
            </div>
            <h3 style={{ color: "#0C1F3D", fontWeight: 600, fontSize: "0.95rem", lineHeight: 1.3 }}>{event.title}</h3>
          </div>
          <div className="text-right shrink-0">
            <p style={{ color: "#0D9488", fontWeight: 700, fontSize: "0.9rem" }}>{fee}</p>
          </div>
        </div>

        <div className="space-y-1.5 mb-3">
          <div className="flex items-center gap-2" style={{ color: "#717182", fontSize: "0.78rem" }}>
            <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: "#0D9488" }} />
            {event.date}
          </div>
          <div className="flex items-center gap-2" style={{ color: "#717182", fontSize: "0.78rem" }}>
            <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: "#0D9488" }} />
            {event.time}
          </div>
          <div className="flex items-center gap-2" style={{ color: "#717182", fontSize: "0.78rem" }}>
            <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: "#0D9488" }} />
            {event.venue}
          </div>
        </div>

        {/* Capacity bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="flex items-center gap-1" style={{ color: "#717182", fontSize: "0.7rem" }}>
              <Users className="w-3 h-3" />
              {event.registered}/{event.capacity} registered
            </span>
            <span style={{ color: fillPercent > 85 ? "#d4183d" : "#0D9488", fontSize: "0.7rem", fontWeight: 600 }}>
              {100 - fillPercent}% left
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full" style={{ background: "#E8EDF8" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${fillPercent}%`,
                background: fillPercent > 85 ? "#d4183d" : "linear-gradient(90deg, #0D9488, #14B8A6)",
              }}
            />
          </div>
        </div>

        <button
          onClick={handleRegister}
          disabled={registering || (event.visibility === "members" && isGuest)}
          className="w-full py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
          style={{
            background: registered ? "#E8EDF8" : event.visibility === "members" && isGuest ? "#E8EDF8" : "linear-gradient(135deg, #0C1F3D, #1A3259)",
            color: registered ? "#0D9488" : event.visibility === "members" && isGuest ? "#717182" : "white",
            border: "none",
            cursor: registered || (event.visibility === "members" && isGuest) ? "not-allowed" : "pointer",
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          {registered ? (
            <><CheckCircle2 className="w-4 h-4" /> Registered</>
          ) : event.visibility === "members" && isGuest ? (
            "Members Only"
          ) : registering ? (
            "Registering..."
          ) : (
            "Register Now →"
          )}
        </button>
      </div>
    </div>
  );
}

function DocumentsList() {
  const typeColors: Record<string, string> = {
    MoM: "#0D9488",
    Constitution: "#0C1F3D",
    Report: "#6366F1",
    Policy: "#F59E0B",
  };

  return (
    <div className="space-y-3">
      <div className="p-4 rounded-xl mb-2" style={{ background: "#F0F4FF" }}>
        <p style={{ color: "#0C1F3D", fontSize: "0.8rem" }}>
          Official documents and records from AMSAM are available here. These are approved for public access.
        </p>
      </div>
      {mockDocs.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center gap-3 p-4 rounded-xl shadow-sm transition-all hover:shadow-md"
          style={{ background: "white", border: "1px solid #E8EDF8" }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${typeColors[doc.type] || "#717182"}15` }}
          >
            <FileText className="w-5 h-5" style={{ color: typeColors[doc.type] || "#717182" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p style={{ color: "#0C1F3D", fontWeight: 500, fontSize: "0.85rem", lineHeight: 1.3 }} className="line-clamp-2">
              {doc.title}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="px-1.5 py-0.5 rounded"
                style={{ background: `${typeColors[doc.type]}15`, color: typeColors[doc.type], fontSize: "0.6rem", fontWeight: 600 }}
              >
                {doc.type}
              </span>
              <span style={{ color: "#717182", fontSize: "0.7rem" }}>{doc.date}</span>
              <span style={{ color: "#717182", fontSize: "0.7rem" }}>· {doc.size}</span>
            </div>
          </div>
          <button
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all hover:opacity-80"
            style={{ background: "#0C1F3D", border: "none", cursor: "pointer" }}
          >
            <Download className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function StudentDashboard({ userName, userRole, onSignOut }: StudentDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>("id");
  const [notifCount] = useState(2);
  const isGuest = userRole === "guest";

  const tabs: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: "id", icon: <CreditCard className="w-5 h-5" />, label: "My ID" },
    { id: "events", icon: <Calendar className="w-5 h-5" />, label: "Events" },
    { id: "docs", icon: <FileText className="w-5 h-5" />, label: "Documents" },
  ];

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#F0F4FF", fontFamily: "'Inter', 'Outfit', sans-serif", maxWidth: "480px", margin: "0 auto" }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-20 px-4 pt-10 pb-4"
        style={{
          background: "linear-gradient(135deg, #0C1F3D 0%, #1A3259 100%)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem" }}>
              Welcome back,
            </p>
            <h1 style={{ color: "white", fontWeight: 700, fontSize: "1.15rem", lineHeight: 1.2 }}>
              {userName}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "#0D9488" }}
              />
              <span style={{ color: "#14B8A6", fontSize: "0.7rem", fontWeight: 500 }}>
                {isGuest ? "Guest Member" : "AMSAM Member · Active"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
                style={{ background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer" }}
              >
                <Bell className="w-4.5 h-4.5 text-white" />
              </button>
              {notifCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full flex items-center justify-center"
                  style={{ background: "#F59E0B", color: "#0C1F3D", fontSize: "0.6rem", fontWeight: 700 }}
                >
                  {notifCount}
                </span>
              )}
            </div>
            <button
              onClick={onSignOut}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
              style={{ background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer" }}
            >
              <LogOut className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div
          className="mt-4 p-3 rounded-xl flex items-center gap-4"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <div className="flex-1 text-center">
            <p style={{ color: "#F59E0B", fontWeight: 700, fontSize: "1.1rem" }}>3</p>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.65rem" }}>Upcoming</p>
          </div>
          <div className="w-px h-8" style={{ background: "rgba(255,255,255,0.15)" }} />
          <div className="flex-1 text-center">
            <p style={{ color: "#14B8A6", fontWeight: 700, fontSize: "1.1rem" }}>1</p>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.65rem" }}>Registered</p>
          </div>
          <div className="w-px h-8" style={{ background: "rgba(255,255,255,0.15)" }} />
          <div className="flex-1 text-center">
            <p style={{ color: "rgba(255,255,255,0.9)", fontWeight: 700, fontSize: "1.1rem" }}>5</p>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.65rem" }}>Docs</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {activeTab === "id" && (
          <div>
            <h2 className="mb-4" style={{ color: "#0C1F3D", fontWeight: 600, fontSize: "1rem" }}>
              Digital Membership Card
            </h2>
            <DigitalIDCard userName={userName} userRole={userRole} />
            {!isGuest && (
              <div
                className="mt-4 p-4 rounded-xl flex items-center gap-3"
                style={{ background: "linear-gradient(135deg, rgba(13,148,136,0.08), rgba(12,31,61,0.06))", border: "1px solid rgba(13,148,136,0.2)" }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#0D9488" }}>
                  <Star className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p style={{ color: "#0C1F3D", fontWeight: 600, fontSize: "0.85rem" }}>AMSAM Member — 2026</p>
                  <p style={{ color: "#717182", fontSize: "0.75rem" }}>Membership fee paid · Valid till Dec 31, 2026</p>
                </div>
                <ChevronRight className="w-4 h-4 ml-auto" style={{ color: "#0D9488" }} />
              </div>
            )}
          </div>
        )}

        {activeTab === "events" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ color: "#0C1F3D", fontWeight: 600, fontSize: "1rem" }}>Upcoming Events</h2>
              <span
                className="px-2 py-1 rounded-lg"
                style={{ background: "#0D9488", color: "white", fontSize: "0.7rem", fontWeight: 600 }}
              >
                {mockEvents.filter(e => e.visibility === "public" || !isGuest).length} events
              </span>
            </div>
            <div className="space-y-4">
              {mockEvents
                .filter(e => e.visibility === "public" || !isGuest)
                .map((event) => (
                  <EventCard key={event.id} event={event} isGuest={isGuest} />
                ))}
              {isGuest && (
                <div
                  className="p-4 rounded-xl text-center"
                  style={{ background: "rgba(13,148,136,0.08)", border: "1px dashed #0D9488" }}
                >
                  <p style={{ color: "#0D9488", fontSize: "0.8rem", fontWeight: 500 }}>
                    Some events are exclusive to AMSAM members. Join AIIMS Mangalagiri to unlock all events!
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "docs" && (
          <div>
            <h2 className="mb-4" style={{ color: "#0C1F3D", fontWeight: 600, fontSize: "1rem" }}>
              Documents Library
            </h2>
            <DocumentsList />
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] px-4 pb-4 pt-2 z-20"
        style={{ background: "linear-gradient(to top, #F0F4FF 60%, transparent)" }}
      >
        <div
          className="rounded-2xl flex items-center justify-around p-2 shadow-xl"
          style={{ background: "white", border: "1px solid #E8EDF8" }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-all"
              style={{
                background: activeTab === tab.id ? "#0C1F3D" : "transparent",
                color: activeTab === tab.id ? "white" : "#717182",
                border: "none",
                cursor: "pointer",
                minWidth: "80px",
              }}
            >
              {tab.icon}
              <span style={{ fontSize: "0.65rem", fontWeight: 500 }}>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
