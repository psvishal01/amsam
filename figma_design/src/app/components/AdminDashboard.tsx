import { useState, useRef } from "react";
import {
  Users, Calendar, FileText, QrCode, LogOut, Upload, Trash2,
  Plus, Search, Filter, Download, Eye, CheckSquare, Square,
  Mail, Building2, Clock, MapPin, DollarSign, ChevronDown,
  BarChart3, TrendingUp, UserCheck, AlertCircle, X, Check,
  Stethoscope, Menu, Bell, Settings, MoreVertical,
} from "lucide-react";
import { Switch } from "./ui/switch";

interface AdminDashboardProps {
  adminName: string;
  onSignOut: () => void;
}

type AdminTab = "overview" | "students" | "guests" | "events" | "documents" | "scanner";

const mockStudents = [
  { id: 1, name: "Arjun Sharma", email: "arjun@aiims.edu", batch: "MBBS 2024", roll: "AIIMS/MBBS/2024/089", paid: true, role: "Student" },
  { id: 2, name: "Priya Nambiar", email: "priya@aiims.edu", batch: "MBBS 2023", roll: "AIIMS/MBBS/2023/034", paid: true, role: "Student" },
  { id: 3, name: "Rohan Verma", email: "rohan@aiims.edu", batch: "MBBS 2024", roll: "AIIMS/MBBS/2024/102", paid: false, role: "Student" },
  { id: 4, name: "Sneha Pillai", email: "sneha@aiims.edu", batch: "MBBS 2022", roll: "AIIMS/MBBS/2022/007", paid: true, role: "Student" },
  { id: 5, name: "Akash Mehta", email: "akash@aiims.edu", batch: "MBBS 2025", roll: "AIIMS/MBBS/2025/156", paid: false, role: "Student" },
  { id: 6, name: "Kavya Krishnan", email: "kavya@aiims.edu", batch: "MBBS 2023", roll: "AIIMS/MBBS/2023/078", paid: true, role: "Student" },
  { id: 7, name: "Rahul Das", email: "rahul@aiims.edu", batch: "MBBS 2025", roll: "AIIMS/MBBS/2025/211", paid: true, role: "Student" },
];

const mockGuests = [
  { id: 1, name: "Dr. Ananya Roy", email: "ananya@jipmer.edu", org: "JIPMER, Puducherry", phone: "+91 98001 11234", joined: "May 15, 2026" },
  { id: 2, name: "Vikram Nair", email: "vikram@amrita.edu", org: "Amrita Institute, Kochi", phone: "+91 90002 22345", joined: "May 18, 2026" },
  { id: 3, name: "Meena Suresh", email: "meena@srmc.edu", org: "SRM Medical College", phone: "+91 89003 33456", joined: "May 20, 2026" },
  { id: 4, name: "Preetham K", email: "preetham@manipal.edu", org: "Manipal College of Medicine", phone: "+91 78004 44567", joined: "May 22, 2026" },
];

const mockEvents = [
  { id: 1, title: "Annual Medical Symposium 2026", date: "June 15, 2026", time: "9:00 AM", venue: "Main Auditorium", fee: "Free/₹200", visibility: "public", registrations: 248 },
  { id: 2, title: "Clinical Skills Workshop", date: "June 22, 2026", time: "2:00 PM", venue: "Simulation Lab", fee: "₹150/₹350", visibility: "members", registrations: 38 },
  { id: 3, title: "Blood Donation Drive", date: "July 1, 2026", time: "8:00 AM", venue: "OPD Complex", fee: "Free", visibility: "public", registrations: 120 },
  { id: 4, title: "Research Bootcamp", date: "July 10, 2026", time: "9:00 AM", venue: "Conference Room 1", fee: "₹500/₹800", visibility: "members", registrations: 42 },
];

const mockDocs = [
  { id: 1, title: "Minutes of GBM – May 2026", date: "May 20, 2026", type: "MoM", size: "420 KB", downloads: 134 },
  { id: 2, title: "AMSAM Constitution & Bylaws", date: "Jan 10, 2026", type: "Constitution", size: "1.2 MB", downloads: 89 },
  { id: 3, title: "Annual Report 2025–26", date: "Apr 30, 2026", type: "Report", size: "3.8 MB", downloads: 256 },
  { id: 4, title: "Minutes of Executive Meeting – April", date: "Apr 18, 2026", type: "MoM", size: "310 KB", downloads: 67 },
];

function StatCard({ label, value, icon, color, sub }: { label: string; value: string; icon: React.ReactNode; color: string; sub?: string }) {
  return (
    <div
      className="rounded-2xl p-5 shadow-sm flex flex-col gap-3"
      style={{ background: "white", border: "1px solid #E8EDF8" }}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${color}15` }}
        >
          <div style={{ color }}>{icon}</div>
        </div>
        <TrendingUp className="w-4 h-4" style={{ color: "#0D9488" }} />
      </div>
      <div>
        <p style={{ color: "#0C1F3D", fontWeight: 700, fontSize: "1.75rem", lineHeight: 1 }}>{value}</p>
        <p style={{ color: "#717182", fontSize: "0.8rem", marginTop: "4px" }}>{label}</p>
        {sub && <p style={{ color: "#0D9488", fontSize: "0.75rem", marginTop: "2px" }}>{sub}</p>}
      </div>
    </div>
  );
}

function BulkImportModal({ onClose }: { onClose: () => void }) {
  const [sendEmails, setSendEmails] = useState(true);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleImport = () => {
    setImporting(true);
    setTimeout(() => {
      setImporting(false);
      setImported(true);
      setTimeout(onClose, 1500);
    }, 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl"
        style={{ background: "white" }}
      >
        <div className="p-6 border-b" style={{ borderColor: "#E8EDF8" }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 style={{ color: "#0C1F3D", fontWeight: 700, fontSize: "1.1rem" }}>Bulk Import Students</h3>
              <p style={{ color: "#717182", fontSize: "0.8rem", marginTop: "2px" }}>Upload an Excel sheet to add students in bulk</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-80"
              style={{ background: "#F0F4FF", border: "none", cursor: "pointer" }}
            >
              <X className="w-4 h-4" style={{ color: "#0C1F3D" }} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* File upload area */}
          <div
            className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer hover:opacity-80 transition-all"
            style={{ borderColor: "#0D9488", background: "rgba(13,148,136,0.04)" }}
            onClick={() => fileRef.current?.click()}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#0D948815" }}>
              <Upload className="w-6 h-6" style={{ color: "#0D9488" }} />
            </div>
            <div className="text-center">
              <p style={{ color: "#0C1F3D", fontWeight: 600, fontSize: "0.9rem" }}>
                {fileName || "Drop Excel file here"}
              </p>
              <p style={{ color: "#717182", fontSize: "0.75rem" }}>Supports .xlsx, .xls, .csv</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => setFileName(e.target.files?.[0]?.name || null)}
            />
          </div>

          {/* Template download */}
          <button
            className="w-full py-2 rounded-xl flex items-center justify-center gap-2 hover:opacity-80 transition-all"
            style={{ background: "#F0F4FF", color: "#0C1F3D", border: "none", cursor: "pointer", fontSize: "0.85rem" }}
          >
            <Download className="w-4 h-4" />
            Download Template Excel
          </button>

          {/* Send emails toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: "#F0F4FF" }}>
            <div>
              <p style={{ color: "#0C1F3D", fontWeight: 500, fontSize: "0.9rem" }}>Send Welcome Emails</p>
              <p style={{ color: "#717182", fontSize: "0.75rem" }}>Notify students with login credentials</p>
            </div>
            <Switch checked={sendEmails} onCheckedChange={setSendEmails} />
          </div>

          {imported && (
            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(13,148,136,0.1)" }}>
              <Check className="w-4 h-4" style={{ color: "#0D9488" }} />
              <p style={{ color: "#0D9488", fontSize: "0.85rem", fontWeight: 500 }}>Import successful! Students added.</p>
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={importing || imported || !fileName}
            className="w-full py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95"
            style={{
              background: imported ? "#0D9488" : "linear-gradient(135deg, #0C1F3D, #1A3259)",
              color: "white",
              border: "none",
              cursor: (!fileName || importing) ? "not-allowed" : "pointer",
              fontWeight: 600,
              opacity: !fileName ? 0.6 : 1,
            }}
          >
            {importing ? "Importing..." : imported ? <><Check className="w-4 h-4" /> Done!</> : "Start Import"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateEventModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ title: "", date: "", time: "", venue: "", description: "", fee: "", visibility: "public" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => { setSaving(false); setSaved(true); setTimeout(onClose, 1200); }, 1200);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
    >
      <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" style={{ background: "white" }}>
        <div className="p-5 border-b" style={{ borderColor: "#E8EDF8" }}>
          <div className="flex items-center justify-between">
            <h3 style={{ color: "#0C1F3D", fontWeight: 700, fontSize: "1.1rem" }}>Create New Event</h3>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-80" style={{ background: "#F0F4FF", border: "none", cursor: "pointer" }}>
              <X className="w-4 h-4" style={{ color: "#0C1F3D" }} />
            </button>
          </div>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {[
            { key: "title", label: "Event Title", placeholder: "Annual Medical Symposium 2026", icon: <Calendar className="w-4 h-4" /> },
            { key: "venue", label: "Venue", placeholder: "Main Auditorium, AIIMS Mangalagiri", icon: <MapPin className="w-4 h-4" /> },
            { key: "fee", label: "Entry Fee (Member / Guest)", placeholder: "e.g. Free / ₹200", icon: <DollarSign className="w-4 h-4" /> },
          ].map(({ key, label, placeholder, icon }) => (
            <div key={key}>
              <label style={{ color: "#0C1F3D", fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "4px" }}>{label}</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#0D9488" }}>{icon}</div>
                <input
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full rounded-xl"
                  style={{ border: "1px solid #E8EDF8", background: "#F0F4FF", color: "#0C1F3D", padding: "10px 12px 10px 36px", fontSize: "0.85rem", outline: "none" }}
                />
              </div>
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{ color: "#0C1F3D", fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "4px" }}>Date</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full rounded-xl" style={{ border: "1px solid #E8EDF8", background: "#F0F4FF", color: "#0C1F3D", padding: "10px 12px", fontSize: "0.85rem", outline: "none" }} />
            </div>
            <div>
              <label style={{ color: "#0C1F3D", fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "4px" }}>Time</label>
              <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="w-full rounded-xl" style={{ border: "1px solid #E8EDF8", background: "#F0F4FF", color: "#0C1F3D", padding: "10px 12px", fontSize: "0.85rem", outline: "none" }} />
            </div>
          </div>

          <div>
            <label style={{ color: "#0C1F3D", fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "4px" }}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Brief description of the event..."
              rows={3}
              className="w-full rounded-xl resize-none"
              style={{ border: "1px solid #E8EDF8", background: "#F0F4FF", color: "#0C1F3D", padding: "10px 12px", fontSize: "0.85rem", outline: "none" }}
            />
          </div>

          <div>
            <label style={{ color: "#0C1F3D", fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "8px" }}>Visibility</label>
            <div className="flex gap-2">
              {["public", "members"].map((v) => (
                <button
                  key={v}
                  onClick={() => setForm({ ...form, visibility: v })}
                  className="flex-1 py-2 rounded-xl transition-all"
                  style={{
                    background: form.visibility === v ? "#0C1F3D" : "#F0F4FF",
                    color: form.visibility === v ? "white" : "#717182",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 500,
                    fontSize: "0.85rem",
                    textTransform: "capitalize",
                  }}
                >
                  {v === "public" ? "Public" : "Members Only"}
                </button>
              ))}
            </div>
          </div>

          {saved && (
            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(13,148,136,0.1)" }}>
              <Check className="w-4 h-4" style={{ color: "#0D9488" }} />
              <p style={{ color: "#0D9488", fontSize: "0.85rem", fontWeight: 500 }}>Event created successfully!</p>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #0C1F3D, #1A3259)", color: "white", border: "none", cursor: "pointer", fontWeight: 600 }}
          >
            {saving ? "Creating..." : saved ? <><Check className="w-4 h-4" /> Created!</> : <><Plus className="w-4 h-4" /> Create Event</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function UploadDocModal({ onClose }: { onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [docTitle, setDocTitle] = useState("");
  const [docType, setDocType] = useState("MoM");
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  const handleUpload = () => {
    setUploading(true);
    setTimeout(() => { setUploading(false); setUploaded(true); setTimeout(onClose, 1200); }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl" style={{ background: "white" }}>
        <div className="p-5 border-b" style={{ borderColor: "#E8EDF8" }}>
          <div className="flex items-center justify-between">
            <h3 style={{ color: "#0C1F3D", fontWeight: 700, fontSize: "1.1rem" }}>Upload Document</h3>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#F0F4FF", border: "none", cursor: "pointer" }}>
              <X className="w-4 h-4" style={{ color: "#0C1F3D" }} />
            </button>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div
            className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer hover:opacity-80"
            style={{ borderColor: "#0D9488", background: "rgba(13,148,136,0.04)" }}
            onClick={() => fileRef.current?.click()}
          >
            <FileText className="w-8 h-8" style={{ color: "#0D9488" }} />
            <p style={{ color: "#0C1F3D", fontWeight: 500 }}>{fileName || "Click to select file"}</p>
            <p style={{ color: "#717182", fontSize: "0.75rem" }}>PDF, DOCX, XLSX up to 20MB</p>
            <input ref={fileRef} type="file" className="hidden" onChange={(e) => setFileName(e.target.files?.[0]?.name || null)} />
          </div>
          <div>
            <label style={{ color: "#0C1F3D", fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "4px" }}>Document Title</label>
            <input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="Minutes of GBM – June 2026" className="w-full rounded-xl" style={{ border: "1px solid #E8EDF8", background: "#F0F4FF", color: "#0C1F3D", padding: "10px 12px", fontSize: "0.85rem", outline: "none" }} />
          </div>
          <div>
            <label style={{ color: "#0C1F3D", fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "8px" }}>Document Type</label>
            <div className="flex flex-wrap gap-2">
              {["MoM", "Report", "Constitution", "Policy", "Other"].map((t) => (
                <button key={t} onClick={() => setDocType(t)} className="px-3 py-1.5 rounded-lg text-sm transition-all" style={{ background: docType === t ? "#0C1F3D" : "#F0F4FF", color: docType === t ? "white" : "#717182", border: "none", cursor: "pointer", fontWeight: 500 }}>{t}</button>
              ))}
            </div>
          </div>
          {uploaded && (
            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(13,148,136,0.1)" }}>
              <Check className="w-4 h-4" style={{ color: "#0D9488" }} />
              <p style={{ color: "#0D9488", fontSize: "0.85rem", fontWeight: 500 }}>Document uploaded successfully!</p>
            </div>
          )}
          <button onClick={handleUpload} disabled={uploading || !fileName} className="w-full py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:opacity-90" style={{ background: "linear-gradient(135deg, #0C1F3D, #1A3259)", color: "white", border: "none", cursor: (!fileName || uploading) ? "not-allowed" : "pointer", fontWeight: 600, opacity: !fileName ? 0.6 : 1 }}>
            {uploading ? "Uploading..." : <><Upload className="w-4 h-4" /> Upload Document</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function QRScannerTab() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{ valid: boolean; name: string; roll: string } | null>(null);
  const [scanCount, setScanCount] = useState(0);

  const simulateScan = () => {
    setScanning(true);
    setResult(null);
    setTimeout(() => {
      setScanning(false);
      setScanCount(c => c + 1);
      const valid = Math.random() > 0.2;
      setResult(
        valid
          ? { valid: true, name: mockStudents[scanCount % mockStudents.length].name, roll: mockStudents[scanCount % mockStudents.length].roll }
          : { valid: false, name: "Unknown", roll: "NOT FOUND" }
      );
    }, 1800);
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h2 style={{ color: "#0C1F3D", fontWeight: 700, fontSize: "1.3rem" }}>QR Code Verifier</h2>
        <p style={{ color: "#717182", fontSize: "0.85rem", marginTop: "4px" }}>Scan student ID cards at event entry points</p>
      </div>

      {/* Camera frame */}
      <div
        className="relative rounded-2xl overflow-hidden shadow-xl mb-6"
        style={{ background: "#0C1F3D", aspectRatio: "1", maxWidth: "360px", margin: "0 auto 24px" }}
      >
        {/* Corner brackets */}
        {["top-4 left-4", "top-4 right-4", "bottom-4 left-4", "bottom-4 right-4"].map((pos, i) => (
          <div
            key={i}
            className={`absolute ${pos} w-8 h-8`}
            style={{
              borderTop: i < 2 ? "3px solid #0D9488" : "none",
              borderBottom: i >= 2 ? "3px solid #0D9488" : "none",
              borderLeft: (i === 0 || i === 2) ? "3px solid #0D9488" : "none",
              borderRight: (i === 1 || i === 3) ? "3px solid #0D9488" : "none",
            }}
          />
        ))}

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          {scanning ? (
            <>
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center animate-pulse"
                style={{ background: "rgba(13,148,136,0.2)", border: "2px solid #0D9488" }}
              >
                <QrCode className="w-8 h-8" style={{ color: "#0D9488" }} />
              </div>
              <div>
                <div className="w-48 h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <div className="h-full rounded-full animate-pulse" style={{ width: "60%", background: "#0D9488" }} />
                </div>
                <p style={{ color: "#14B8A6", fontSize: "0.8rem", marginTop: "8px", textAlign: "center" }}>Scanning...</p>
              </div>
            </>
          ) : (
            <>
              <QrCode className="w-16 h-16" style={{ color: "rgba(255,255,255,0.2)" }} />
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>Point camera at QR code</p>
            </>
          )}
        </div>
      </div>

      {/* Result */}
      {result && (
        <div
          className="p-4 rounded-2xl mb-4 flex items-center gap-4 shadow-md"
          style={{
            background: result.valid ? "rgba(13,148,136,0.1)" : "rgba(212,24,61,0.1)",
            border: `2px solid ${result.valid ? "#0D9488" : "#d4183d"}`,
          }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: result.valid ? "#0D9488" : "#d4183d" }}
          >
            {result.valid ? <Check className="w-6 h-6 text-white" /> : <X className="w-6 h-6 text-white" />}
          </div>
          <div>
            <p style={{ color: result.valid ? "#0D9488" : "#d4183d", fontWeight: 700, fontSize: "1rem" }}>
              {result.valid ? "✓ Identity Verified" : "✗ Invalid / Not Found"}
            </p>
            {result.valid && (
              <>
                <p style={{ color: "#0C1F3D", fontWeight: 600 }}>{result.name}</p>
                <p style={{ color: "#717182", fontSize: "0.75rem" }}>{result.roll}</p>
              </>
            )}
            {!result.valid && (
              <p style={{ color: "#717182", fontSize: "0.8rem" }}>This QR code is not recognized in the system.</p>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={simulateScan}
          disabled={scanning}
          className="flex-1 py-4 rounded-2xl flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95"
          style={{
            background: scanning ? "#717182" : "linear-gradient(135deg, #0C1F3D, #0D9488)",
            color: "white",
            border: "none",
            cursor: scanning ? "not-allowed" : "pointer",
            fontWeight: 700,
            fontSize: "1rem",
          }}
        >
          <QrCode className="w-5 h-5" />
          {scanning ? "Scanning..." : "Simulate Scan"}
        </button>
      </div>

      <div className="mt-4 p-4 rounded-xl flex items-center gap-3" style={{ background: "#F0F4FF" }}>
        <UserCheck className="w-5 h-5" style={{ color: "#0D9488" }} />
        <div>
          <p style={{ color: "#0C1F3D", fontWeight: 600, fontSize: "0.85rem" }}>Session Statistics</p>
          <p style={{ color: "#717182", fontSize: "0.75rem" }}>Scanned this session: {scanCount} · {Math.round(scanCount * 0.8)} verified</p>
        </div>
      </div>
    </div>
  );
}

export function AdminDashboard({ adminName, onSignOut }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showUploadDoc, setShowUploadDoc] = useState(false);
  const [searchStudents, setSearchStudents] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [students, setStudents] = useState(mockStudents);

  const navItems: { id: AdminTab; icon: React.ReactNode; label: string; count?: number }[] = [
    { id: "overview", icon: <BarChart3 className="w-5 h-5" />, label: "Overview" },
    { id: "students", icon: <Users className="w-5 h-5" />, label: "Students", count: students.length },
    { id: "guests", icon: <Building2 className="w-5 h-5" />, label: "Guests", count: mockGuests.length },
    { id: "events", icon: <Calendar className="w-5 h-5" />, label: "Events", count: mockEvents.length },
    { id: "documents", icon: <FileText className="w-5 h-5" />, label: "Documents", count: mockDocs.length },
    { id: "scanner", icon: <QrCode className="w-5 h-5" />, label: "QR Scanner" },
  ];

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchStudents.toLowerCase()) ||
    s.email.toLowerCase().includes(searchStudents.toLowerCase()) ||
    s.batch.toLowerCase().includes(searchStudents.toLowerCase())
  );

  const toggleStudent = (id: number) => {
    setSelectedStudents(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const deleteSelected = () => {
    setStudents(prev => prev.filter(s => !selectedStudents.includes(s.id)));
    setSelectedStudents([]);
  };

  const Sidebar = () => (
    <aside
      className="flex flex-col h-full"
      style={{ background: "#0C1F3D", width: "240px", minWidth: "240px" }}
    >
      {/* Logo */}
      <div className="p-5 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#0D9488" }}>
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div>
            <p style={{ color: "white", fontWeight: 700, fontSize: "0.9rem" }}>AMSAM Admin</p>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.65rem" }}>Super Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
            style={{
              background: activeTab === item.id ? "rgba(13,148,136,0.2)" : "transparent",
              color: activeTab === item.id ? "#14B8A6" : "rgba(255,255,255,0.6)",
              border: activeTab === item.id ? "1px solid rgba(13,148,136,0.3)" : "1px solid transparent",
              cursor: "pointer",
            }}
          >
            {item.icon}
            <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>{item.label}</span>
            {item.count !== undefined && (
              <span
                className="ml-auto px-2 py-0.5 rounded-full"
                style={{
                  background: activeTab === item.id ? "rgba(13,148,136,0.3)" : "rgba(255,255,255,0.1)",
                  color: activeTab === item.id ? "#14B8A6" : "rgba(255,255,255,0.5)",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                }}
              >
                {item.count}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* User */}
      <div className="p-4 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#1A3259", color: "#14B8A6", fontWeight: 700 }}>
            {adminName.split(" ").map(w => w[0]).join("").slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p style={{ color: "white", fontWeight: 600, fontSize: "0.85rem" }} className="truncate">{adminName}</p>
            <p style={{ color: "#14B8A6", fontSize: "0.7rem" }}>Super Admin</p>
          </div>
          <button onClick={onSignOut} className="w-8 h-8 flex items-center justify-center rounded-lg hover:opacity-80" style={{ background: "rgba(255,255,255,0.08)", border: "none", cursor: "pointer" }}>
            <LogOut className="w-4 h-4" style={{ color: "rgba(255,255,255,0.5)" }} />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ fontFamily: "'Inter', 'Outfit', sans-serif", background: "#F0F4FF" }}>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full flex">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header
          className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10"
          style={{ background: "white", borderColor: "#E8EDF8" }}
        >
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "#F0F4FF", border: "none", cursor: "pointer" }}
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" style={{ color: "#0C1F3D" }} />
            </button>
            <div>
              <h1 style={{ color: "#0C1F3D", fontWeight: 700, fontSize: "1.1rem" }}>
                {navItems.find(n => n.id === activeTab)?.label}
              </h1>
              <p style={{ color: "#717182", fontSize: "0.75rem" }}>AMSAM · AIIMS Mangalagiri</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-xl flex items-center justify-center relative" style={{ background: "#F0F4FF", border: "none", cursor: "pointer" }}>
              <Bell className="w-4 h-4" style={{ color: "#0C1F3D" }} />
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full" style={{ background: "#F59E0B" }} />
            </button>
            <button className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#F0F4FF", border: "none", cursor: "pointer" }}>
              <Settings className="w-4 h-4" style={{ color: "#0C1F3D" }} />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">

          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Students" value={`${students.length}`} icon={<Users className="w-5 h-5" />} color="#0C1F3D" sub="+3 this month" />
                <StatCard label="Paid Members" value={`${students.filter(s => s.paid).length}`} icon={<UserCheck className="w-5 h-5" />} color="#0D9488" sub="85.7% rate" />
                <StatCard label="Guest Users" value={`${mockGuests.length}`} icon={<Building2 className="w-5 h-5" />} color="#F59E0B" sub="From 4 institutions" />
                <StatCard label="Active Events" value={`${mockEvents.length}`} icon={<Calendar className="w-5 h-5" />} color="#6366F1" sub="2 upcoming this month" />
              </div>

              {/* Recent activity */}
              <div className="grid lg:grid-cols-2 gap-4">
                <div className="rounded-2xl p-5 shadow-sm" style={{ background: "white", border: "1px solid #E8EDF8" }}>
                  <h3 style={{ color: "#0C1F3D", fontWeight: 600, fontSize: "0.95rem", marginBottom: "16px" }}>Recent Registrations</h3>
                  <div className="space-y-3">
                    {students.slice(0, 4).map(s => (
                      <div key={s.id} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#F0F4FF", color: "#0C1F3D", fontWeight: 700, fontSize: "0.75rem" }}>
                          {s.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p style={{ color: "#0C1F3D", fontWeight: 500, fontSize: "0.85rem" }} className="truncate">{s.name}</p>
                          <p style={{ color: "#717182", fontSize: "0.7rem" }}>{s.batch}</p>
                        </div>
                        <span
                          className="px-2 py-0.5 rounded-full shrink-0"
                          style={{ background: s.paid ? "rgba(13,148,136,0.1)" : "rgba(212,24,61,0.1)", color: s.paid ? "#0D9488" : "#d4183d", fontSize: "0.65rem", fontWeight: 600 }}
                        >
                          {s.paid ? "Paid" : "Unpaid"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl p-5 shadow-sm" style={{ background: "white", border: "1px solid #E8EDF8" }}>
                  <h3 style={{ color: "#0C1F3D", fontWeight: 600, fontSize: "0.95rem", marginBottom: "16px" }}>Upcoming Events</h3>
                  <div className="space-y-3">
                    {mockEvents.slice(0, 3).map(e => (
                      <div key={e.id} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#F0F4FF" }}>
                          <Calendar className="w-4 h-4" style={{ color: "#0C1F3D" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p style={{ color: "#0C1F3D", fontWeight: 500, fontSize: "0.85rem" }} className="truncate">{e.title}</p>
                          <p style={{ color: "#717182", fontSize: "0.7rem" }}>{e.date} · {e.registrations} registered</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Payment status */}
              <div className="rounded-2xl p-5 shadow-sm" style={{ background: "white", border: "1px solid #E8EDF8" }}>
                <h3 style={{ color: "#0C1F3D", fontWeight: 600, fontSize: "0.95rem", marginBottom: "16px" }}>Membership Payment Status</h3>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span style={{ color: "#717182", fontSize: "0.75rem" }}>Paid ({students.filter(s => s.paid).length})</span>
                      <span style={{ color: "#0D9488", fontSize: "0.75rem", fontWeight: 600 }}>{Math.round(students.filter(s => s.paid).length / students.length * 100)}%</span>
                    </div>
                    <div className="w-full h-3 rounded-full" style={{ background: "#E8EDF8" }}>
                      <div className="h-full rounded-full" style={{ width: `${students.filter(s => s.paid).length / students.length * 100}%`, background: "linear-gradient(90deg, #0D9488, #14B8A6)" }} />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span style={{ color: "#717182", fontSize: "0.75rem" }}>Unpaid ({students.filter(s => !s.paid).length})</span>
                      <span style={{ color: "#d4183d", fontSize: "0.75rem", fontWeight: 600 }}>{Math.round(students.filter(s => !s.paid).length / students.length * 100)}%</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className="relative w-24 h-24">
                      <svg viewBox="0 0 36 36" className="w-full h-full">
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#E8EDF8" strokeWidth="3" />
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#0D9488" strokeWidth="3" strokeDasharray={`${Math.round(students.filter(s => s.paid).length / students.length * 100)}, 100`} strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span style={{ color: "#0C1F3D", fontWeight: 700, fontSize: "1.1rem" }}>{Math.round(students.filter(s => s.paid).length / students.length * 100)}%</span>
                      </div>
                    </div>
                    <span style={{ color: "#717182", fontSize: "0.65rem" }}>Paid</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STUDENTS */}
          {activeTab === "students" && (
            <div>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#717182" }} />
                  <input
                    value={searchStudents}
                    onChange={e => setSearchStudents(e.target.value)}
                    placeholder="Search by name, email, batch..."
                    className="w-full rounded-xl"
                    style={{ border: "1px solid #E8EDF8", background: "white", color: "#0C1F3D", padding: "10px 12px 10px 36px", fontSize: "0.85rem", outline: "none" }}
                  />
                </div>
                <div className="flex gap-2">
                  {selectedStudents.length > 0 && (
                    <button
                      onClick={deleteSelected}
                      className="px-4 py-2 rounded-xl flex items-center gap-2 transition-all hover:opacity-80"
                      style={{ background: "#d4183d", color: "white", border: "none", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500 }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete ({selectedStudents.length})
                    </button>
                  )}
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="px-4 py-2 rounded-xl flex items-center gap-2 transition-all hover:opacity-80"
                    style={{ background: "#F0F4FF", color: "#0C1F3D", border: "1px solid #E8EDF8", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500 }}
                  >
                    <Upload className="w-4 h-4" />
                    Bulk Import
                  </button>
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: "white", border: "1px solid #E8EDF8" }}>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: "1px solid #E8EDF8" }}>
                        <th className="p-4 text-left w-10">
                          <button
                            onClick={() => setSelectedStudents(selectedStudents.length === filteredStudents.length ? [] : filteredStudents.map(s => s.id))}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#0D9488" }}
                          >
                            {selectedStudents.length === filteredStudents.length && filteredStudents.length > 0
                              ? <CheckSquare className="w-4 h-4" />
                              : <Square className="w-4 h-4" style={{ color: "#717182" }} />}
                          </button>
                        </th>
                        {["Name", "Batch", "Roll Number", "Payment", "Actions"].map(h => (
                          <th key={h} className="p-4 text-left" style={{ color: "#717182", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student, i) => (
                        <tr
                          key={student.id}
                          style={{ borderBottom: i < filteredStudents.length - 1 ? "1px solid #F0F4FF" : "none", background: selectedStudents.includes(student.id) ? "rgba(13,148,136,0.04)" : "transparent" }}
                        >
                          <td className="p-4">
                            <button onClick={() => toggleStudent(student.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#0D9488" }}>
                              {selectedStudents.includes(student.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" style={{ color: "#717182" }} />}
                            </button>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#F0F4FF", color: "#0C1F3D", fontWeight: 700, fontSize: "0.7rem" }}>
                                {student.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                              </div>
                              <div>
                                <p style={{ color: "#0C1F3D", fontWeight: 500, fontSize: "0.875rem" }}>{student.name}</p>
                                <p style={{ color: "#717182", fontSize: "0.7rem" }}>{student.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4" style={{ color: "#717182", fontSize: "0.85rem" }}>{student.batch}</td>
                          <td className="p-4" style={{ color: "#717182", fontSize: "0.85rem", fontFamily: "monospace" }}>{student.roll}</td>
                          <td className="p-4">
                            <span
                              className="px-2.5 py-1 rounded-full"
                              style={{ background: student.paid ? "rgba(13,148,136,0.1)" : "rgba(212,24,61,0.1)", color: student.paid ? "#0D9488" : "#d4183d", fontSize: "0.75rem", fontWeight: 600 }}
                            >
                              {student.paid ? "Paid" : "Unpaid"}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1">
                              <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-80" style={{ background: "#F0F4FF", border: "none", cursor: "pointer" }}>
                                <Eye className="w-3.5 h-3.5" style={{ color: "#0C1F3D" }} />
                              </button>
                              <button onClick={() => { setStudents(prev => prev.filter(s => s.id !== student.id)); setSelectedStudents(prev => prev.filter(id => id !== student.id)); }} className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-80" style={{ background: "rgba(212,24,61,0.08)", border: "none", cursor: "pointer" }}>
                                <Trash2 className="w-3.5 h-3.5" style={{ color: "#d4183d" }} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredStudents.length === 0 && (
                  <div className="p-12 text-center">
                    <Users className="w-10 h-10 mx-auto mb-3" style={{ color: "#E8EDF8" }} />
                    <p style={{ color: "#717182", fontSize: "0.9rem" }}>No students found</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* GUESTS */}
          {activeTab === "guests" && (
            <div>
              <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: "white", border: "1px solid #E8EDF8" }}>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: "1px solid #E8EDF8" }}>
                        {["Name", "Email", "Organization", "Phone", "Joined", "Actions"].map(h => (
                          <th key={h} className="p-4 text-left" style={{ color: "#717182", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {mockGuests.map((guest, i) => (
                        <tr key={guest.id} style={{ borderBottom: i < mockGuests.length - 1 ? "1px solid #F0F4FF" : "none" }}>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(245,158,11,0.1)", color: "#F59E0B", fontWeight: 700, fontSize: "0.7rem" }}>
                                {guest.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                              </div>
                              <p style={{ color: "#0C1F3D", fontWeight: 500, fontSize: "0.875rem" }}>{guest.name}</p>
                            </div>
                          </td>
                          <td className="p-4" style={{ color: "#717182", fontSize: "0.85rem" }}>{guest.email}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5" style={{ color: "#F59E0B" }} />
                              <span style={{ color: "#0C1F3D", fontSize: "0.85rem" }}>{guest.org}</span>
                            </div>
                          </td>
                          <td className="p-4" style={{ color: "#717182", fontSize: "0.85rem" }}>{guest.phone}</td>
                          <td className="p-4" style={{ color: "#717182", fontSize: "0.85rem" }}>{guest.joined}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-1">
                              <button className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#F0F4FF", border: "none", cursor: "pointer" }}>
                                <Eye className="w-3.5 h-3.5" style={{ color: "#0C1F3D" }} />
                              </button>
                              <button className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(212,24,61,0.08)", border: "none", cursor: "pointer" }}>
                                <Trash2 className="w-3.5 h-3.5" style={{ color: "#d4183d" }} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* EVENTS */}
          {activeTab === "events" && (
            <div>
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setShowCreateEvent(true)}
                  className="px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #0C1F3D, #1A3259)", color: "white", border: "none", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 }}
                >
                  <Plus className="w-4 h-4" />
                  Create Event
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {mockEvents.map(event => (
                  <div key={event.id} className="rounded-2xl p-5 shadow-sm" style={{ background: "white", border: "1px solid #E8EDF8" }}>
                    <div className="flex items-start justify-between mb-3">
                      <h3 style={{ color: "#0C1F3D", fontWeight: 600, fontSize: "0.95rem", lineHeight: 1.3, flex: 1, paddingRight: "8px" }}>{event.title}</h3>
                      <span
                        className="px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: event.visibility === "public" ? "rgba(99,102,241,0.1)" : "rgba(13,148,136,0.1)", color: event.visibility === "public" ? "#6366F1" : "#0D9488", fontSize: "0.65rem", fontWeight: 600 }}
                      >
                        {event.visibility === "public" ? "Public" : "Members"}
                      </span>
                    </div>
                    <div className="space-y-1.5 mb-4">
                      <div className="flex items-center gap-2" style={{ color: "#717182", fontSize: "0.8rem" }}>
                        <Calendar className="w-3.5 h-3.5" style={{ color: "#0D9488" }} /> {event.date}
                      </div>
                      <div className="flex items-center gap-2" style={{ color: "#717182", fontSize: "0.8rem" }}>
                        <MapPin className="w-3.5 h-3.5" style={{ color: "#0D9488" }} /> {event.venue}
                      </div>
                      <div className="flex items-center gap-2" style={{ color: "#717182", fontSize: "0.8rem" }}>
                        <Users className="w-3.5 h-3.5" style={{ color: "#0D9488" }} /> {event.registrations} registered · Fee: {event.fee}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="flex-1 py-2 rounded-xl text-sm transition-all hover:opacity-80" style={{ background: "#F0F4FF", color: "#0C1F3D", border: "none", cursor: "pointer", fontWeight: 500 }}>
                        Edit
                      </button>
                      <button className="flex-1 py-2 rounded-xl text-sm transition-all hover:opacity-80" style={{ background: "rgba(212,24,61,0.08)", color: "#d4183d", border: "none", cursor: "pointer", fontWeight: 500 }}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DOCUMENTS */}
          {activeTab === "documents" && (
            <div>
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setShowUploadDoc(true)}
                  className="px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #0C1F3D, #1A3259)", color: "white", border: "none", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 }}
                >
                  <Upload className="w-4 h-4" />
                  Upload Document
                </button>
              </div>
              <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: "white", border: "1px solid #E8EDF8" }}>
                {mockDocs.map((doc, i) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-4 p-4"
                    style={{ borderBottom: i < mockDocs.length - 1 ? "1px solid #F0F4FF" : "none" }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#F0F4FF" }}>
                      <FileText className="w-5 h-5" style={{ color: "#0C1F3D" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ color: "#0C1F3D", fontWeight: 500, fontSize: "0.875rem" }}>{doc.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span style={{ color: "#717182", fontSize: "0.7rem" }}>{doc.date}</span>
                        <span style={{ color: "#717182", fontSize: "0.7rem" }}>· {doc.size}</span>
                        <span style={{ color: "#0D9488", fontSize: "0.7rem" }}>· ↓ {doc.downloads} downloads</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded" style={{ background: "#F0F4FF", color: "#717182", fontSize: "0.65rem", fontWeight: 600 }}>{doc.type}</span>
                      <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-80" style={{ background: "rgba(212,24,61,0.08)", border: "none", cursor: "pointer" }}>
                        <Trash2 className="w-3.5 h-3.5" style={{ color: "#d4183d" }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SCANNER */}
          {activeTab === "scanner" && <QRScannerTab />}
        </main>
      </div>

      {/* Modals */}
      {showImportModal && <BulkImportModal onClose={() => setShowImportModal(false)} />}
      {showCreateEvent && <CreateEventModal onClose={() => setShowCreateEvent(false)} />}
      {showUploadDoc && <UploadDocModal onClose={() => setShowUploadDoc(false)} />}
    </div>
  );
}
