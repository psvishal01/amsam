import { useState } from "react";
import { QrCode, CheckCircle2, XCircle, LogOut, Clock, Users, Shield, Stethoscope, X, Check } from "lucide-react";

interface SubAdminDashboardProps {
  adminName: string;
  onSignOut: () => void;
}

const mockVerified = [
  { name: "Arjun Sharma", roll: "AIIMS/MBBS/2024/089", time: "9:02 AM", valid: true },
  { name: "Priya Nambiar", roll: "AIIMS/MBBS/2023/034", time: "9:05 AM", valid: true },
  { name: "Unknown QR", roll: "—", time: "9:07 AM", valid: false },
  { name: "Sneha Pillai", roll: "AIIMS/MBBS/2022/007", time: "9:10 AM", valid: true },
];

const mockStudents = [
  { name: "Arjun Sharma", roll: "AIIMS/MBBS/2024/089" },
  { name: "Priya Nambiar", roll: "AIIMS/MBBS/2023/034" },
  { name: "Rohan Verma", roll: "AIIMS/MBBS/2024/102" },
  { name: "Sneha Pillai", roll: "AIIMS/MBBS/2022/007" },
  { name: "Akash Mehta", roll: "AIIMS/MBBS/2025/156" },
  { name: "Kavya Krishnan", roll: "AIIMS/MBBS/2023/078" },
  { name: "Rahul Das", roll: "AIIMS/MBBS/2025/211" },
];

export function SubAdminDashboard({ adminName, onSignOut }: SubAdminDashboardProps) {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{ valid: boolean; name: string; roll: string; time: string } | null>(null);
  const [log, setLog] = useState(mockVerified);
  const [scanIndex, setScanIndex] = useState(0);
  const [pulse, setPulse] = useState(false);

  const handleScan = () => {
    setScanning(true);
    setResult(null);
    setPulse(false);

    setTimeout(() => {
      setScanning(false);
      setPulse(true);
      const valid = Math.random() > 0.25;
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const student = mockStudents[scanIndex % mockStudents.length];
      const entry = valid
        ? { valid: true, name: student.name, roll: student.roll, time: timeStr }
        : { valid: false, name: "Unknown QR", roll: "—", time: timeStr };
      setResult(entry);
      setLog(prev => [entry, ...prev.slice(0, 9)]);
      setScanIndex(i => i + 1);
    }, 1800);
  };

  const validCount = log.filter(l => l.valid).length;
  const totalCount = log.length;

  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(160deg, #0C1F3D 0%, #1A3259 100%)", fontFamily: "'Inter', 'Outfit', sans-serif" }}
    >
      {/* Header */}
      <div className="px-4 pt-10 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#0D9488" }}>
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <p style={{ color: "white", fontWeight: 700, fontSize: "1rem" }}>AMSAM Scanner</p>
              <p style={{ color: "#14B8A6", fontSize: "0.7rem" }}>Sub-Admin: {adminName}</p>
            </div>
          </div>
          <button
            onClick={onSignOut}
            className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)", border: "none", cursor: "pointer", fontSize: "0.8rem" }}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        {/* Stats strip */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: "Scanned", value: totalCount, color: "white" },
            { label: "Verified", value: validCount, color: "#14B8A6" },
            { label: "Rejected", value: totalCount - validCount, color: "#f87171" },
          ].map(({ label, value, color }) => (
            <div key={label} className="p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.06)" }}>
              <p style={{ color, fontWeight: 700, fontSize: "1.5rem" }}>{value}</p>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.65rem", marginTop: "2px" }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main scanner area */}
      <div className="px-4 pb-4">
        {/* Camera view */}
        <div
          className="relative rounded-2xl overflow-hidden mx-auto"
          style={{ background: "#050E1E", aspectRatio: "1", maxWidth: "340px" }}
        >
          {/* Corner brackets */}
          {[
            { className: "top-5 left-5", borderTop: true, borderLeft: true },
            { className: "top-5 right-5", borderTop: true, borderRight: true },
            { className: "bottom-5 left-5", borderBottom: true, borderLeft: true },
            { className: "bottom-5 right-5", borderBottom: true, borderRight: true },
          ].map((c, i) => (
            <div
              key={i}
              className={`absolute ${c.className} w-8 h-8 z-10`}
              style={{
                borderTop: c.borderTop ? "3px solid #0D9488" : "none",
                borderBottom: c.borderBottom ? "3px solid #0D9488" : "none",
                borderLeft: c.borderLeft ? "3px solid #0D9488" : "none",
                borderRight: c.borderRight ? "3px solid #0D9488" : "none",
              }}
            />
          ))}

          {/* Scan line animation */}
          {scanning && (
            <div
              className="absolute left-8 right-8 h-0.5 z-20"
              style={{
                background: "linear-gradient(90deg, transparent, #0D9488, transparent)",
                animation: "scan-line 1.8s linear",
                top: "50%",
              }}
            />
          )}

          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            {scanning ? (
              <>
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(13,148,136,0.15)", border: "2px solid #0D9488", animation: "pulse 1s ease-in-out infinite" }}
                >
                  <QrCode className="w-8 h-8" style={{ color: "#0D9488" }} />
                </div>
                <p style={{ color: "#14B8A6", fontSize: "0.85rem", fontWeight: 500 }}>Scanning QR Code...</p>
              </>
            ) : result ? (
              <div className="flex flex-col items-center gap-2">
                {result.valid
                  ? <CheckCircle2 className="w-16 h-16" style={{ color: "#0D9488" }} />
                  : <XCircle className="w-16 h-16" style={{ color: "#f87171" }} />}
                <p style={{ color: result.valid ? "#14B8A6" : "#f87171", fontWeight: 700, fontSize: "0.95rem" }}>
                  {result.valid ? "Verified!" : "Invalid QR"}
                </p>
                {result.valid && <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.8rem" }}>{result.name}</p>}
              </div>
            ) : (
              <>
                <QrCode className="w-16 h-16" style={{ color: "rgba(255,255,255,0.12)" }} />
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.85rem" }}>Tap below to scan</p>
              </>
            )}
          </div>

          {/* Result overlay */}
          {result && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: result.valid ? "rgba(13,148,136,0.06)" : "rgba(248,113,113,0.06)" }}
            />
          )}
        </div>

        {/* Scan button */}
        <button
          onClick={handleScan}
          disabled={scanning}
          className="w-full max-w-[340px] mx-auto mt-4 py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 block"
          style={{
            background: scanning ? "#1A3259" : "linear-gradient(135deg, #0D9488, #14B8A6)",
            color: "white",
            border: "none",
            cursor: scanning ? "not-allowed" : "pointer",
            fontWeight: 700,
            fontSize: "1rem",
          }}
        >
          <QrCode className="w-5 h-5" />
          {scanning ? "Scanning..." : "Scan QR Code"}
        </button>
      </div>

      {/* Result detail */}
      {result && (
        <div className="px-4 mb-4">
          <div
            className="p-4 rounded-2xl flex items-center gap-3"
            style={{
              background: result.valid ? "rgba(13,148,136,0.12)" : "rgba(248,113,113,0.12)",
              border: `1px solid ${result.valid ? "rgba(13,148,136,0.3)" : "rgba(248,113,113,0.3)"}`,
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: result.valid ? "#0D9488" : "#f87171" }}
            >
              {result.valid ? <Check className="w-5 h-5 text-white" /> : <X className="w-5 h-5 text-white" />}
            </div>
            <div className="flex-1">
              <p style={{ color: "white", fontWeight: 700 }}>
                {result.valid ? result.name : "QR Code Not Recognized"}
              </p>
              {result.valid && <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem" }}>{result.roll}</p>}
              {!result.valid && <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem" }}>This ID card is not in the system</p>}
            </div>
            <div className="text-right shrink-0">
              <p style={{ color: result.valid ? "#14B8A6" : "#f87171", fontWeight: 700, fontSize: "0.85rem" }}>
                {result.valid ? "ENTRY OK" : "DENY"}
              </p>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.65rem" }}>{result.time}</p>
            </div>
          </div>
        </div>
      )}

      {/* Scan log */}
      <div className="px-4 pb-8">
        <div className="flex items-center justify-between mb-3">
          <p style={{ color: "rgba(255,255,255,0.7)", fontWeight: 600, fontSize: "0.875rem" }}>
            Scan Log
          </p>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem" }}>Live</p>
          </div>
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {log.slice(0, 6).map((entry, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderBottom: i < Math.min(log.length, 6) - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: entry.valid ? "rgba(13,148,136,0.2)" : "rgba(248,113,113,0.2)" }}
              >
                {entry.valid
                  ? <Check className="w-3.5 h-3.5" style={{ color: "#14B8A6" }} />
                  : <X className="w-3.5 h-3.5" style={{ color: "#f87171" }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ color: "white", fontSize: "0.8rem", fontWeight: 500 }} className="truncate">{entry.name}</p>
                <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.65rem" }}>{entry.roll}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Clock className="w-3 h-3" style={{ color: "rgba(255,255,255,0.3)" }} />
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem" }}>{entry.time}</span>
              </div>
            </div>
          ))}
          {log.length === 0 && (
            <div className="p-6 text-center">
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.8rem" }}>No scans yet this session</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
