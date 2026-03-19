import { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./Kiosk.css";

// Kiosk uses unauthenticated axios — no JWT needed
const kiosk = axios.create({ baseURL: "/api" });

const ROLES_LABELS = {
  trainer:"Trainer", receptionist:"Receptionist",
  cleaner:"Cleaner", manager:"Manager", other:"Staff",
  Member:"Member",
};

export default function Kiosk() {
  const [step,    setStep]    = useState("input");   // input | confirm | success | error
  const [input,   setInput]   = useState("");
  const [person,  setPerson]  = useState(null);
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [errMsg,  setErrMsg]  = useState("");
  const [time,    setTime]    = useState(new Date());
  const inputRef = useRef(null);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-focus input on mount and after each reset
  useEffect(() => {
    if (step === "input") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [step]);

  // Auto-reset to input after success/error
  useEffect(() => {
    if (step === "success" || step === "error") {
      const t = setTimeout(() => reset(), 5000);
      return () => clearTimeout(t);
    }
  }, [step]);

  const reset = () => {
    setStep("input");
    setInput("");
    setPerson(null);
    setResult(null);
    setErrMsg("");
  };

  const lookup = async (e) => {
    e?.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    try {
      const res = await kiosk.post("/members/kiosk/lookup/", { id_input: input.trim() });
      setPerson(res.data);
      setStep("confirm");
    } catch(err) {
      setErrMsg(err.response?.data?.detail || "ID not found. Try again.");
      setStep("error");
    } finally { setLoading(false); }
  };

  const confirm = async () => {
    if (!person) return;
    setLoading(true);
    try {
      const res = await kiosk.post("/members/kiosk/checkin/", {
        type: person.type,
        id:   person.id,
      });
      setResult(res.data);
      setStep("success");
    } catch(err) {
      setErrMsg(err.response?.data?.detail || "Failed to record attendance.");
      setStep("error");
    } finally { setLoading(false); }
  };

  const timeStr = time.toLocaleTimeString("en-IN", {
    hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:true
  });
  const dateStr = time.toLocaleDateString("en-IN", {
    weekday:"long", day:"numeric", month:"long", year:"numeric"
  });

  return (
    <div className="kiosk">
      {/* Background grid */}
      <div className="kiosk__grid"/>
      <div className="kiosk__glow"/>

      {/* Header */}
      <div className="kiosk__header">
        <div className="kiosk__logo">
          <div className="kiosk__logo-mark">G</div>
          <div>
            <div className="kiosk__logo-name">GymPro</div>
            <div className="kiosk__logo-sub">Attendance Kiosk</div>
          </div>
        </div>
        <div className="kiosk__clock">
          <div className="kiosk__time">{timeStr}</div>
          <div className="kiosk__date">{dateStr}</div>
        </div>
      </div>

      {/* Main panel */}
      <div className="kiosk__panel">

        {/* ── INPUT STEP ── */}
        {step === "input" && (
          <div className="kiosk__card animate-in">
            <div className="kiosk__card-icon">◈</div>
            <h2 className="kiosk__card-title">Enter Your ID</h2>
            <p className="kiosk__card-sub">
              Staff: <code>S0001</code> &nbsp;|&nbsp; Member: <code>M0001</code><br/>
              Find your ID on your membership card or ask the front desk.
            </p>
            <form onSubmit={lookup} className="kiosk__form">
              <input
                ref={inputRef}
                className="kiosk__input"
                value={input}
                onChange={e=>setInput(e.target.value.toUpperCase())}
                placeholder="M0001 or S0001"
                maxLength={8}
                autoComplete="off"
                spellCheck={false}
              />
              <button type="submit" className="kiosk__btn kiosk__btn--primary"
                disabled={loading || !input.trim()}>
                {loading ? <span className="spin">⟳</span> : "Look Up →"}
              </button>
            </form>
          </div>
        )}

        {/* ── CONFIRM STEP ── */}
        {step === "confirm" && person && (
          <div className="kiosk__card animate-in">
            <div className={`kiosk__person-badge ${
              person.type==="staff" ? "kiosk__person-badge--staff" : "kiosk__person-badge--member"
            }`}>
              {person.type==="staff" ? "STAFF" : "MEMBER"}
            </div>

            <div className="kiosk__avatar">
              {person.photo
                ? <img src={person.photo} alt={person.name}/>
                : <span>{person.name[0]}</span>
              }
            </div>

            <h2 className="kiosk__name">{person.name}</h2>
            <div className="kiosk__role">{ROLES_LABELS[person.role]||person.role}</div>
            <div className="kiosk__id-pill">{person.display_id}</div>

            {/* Extra info */}
            <div className="kiosk__info-grid">
              {person.type === "member" && (
                <>
                  <div className="kiosk__info-item">
                    <span className="kiosk__info-label">Plan</span>
                    <span className="kiosk__info-val">{person.plan}</span>
                  </div>
                  <div className="kiosk__info-item">
                    <span className="kiosk__info-label">Membership</span>
                    <span className={`kiosk__info-val ${
                      person.status==="active" ? "kiosk__info-val--green" : "kiosk__info-val--red"
                    }`}>{person.status}</span>
                  </div>
                  {person.renewal && (
                    <div className="kiosk__info-item">
                      <span className="kiosk__info-label">Valid Until</span>
                      <span className="kiosk__info-val">{person.renewal}</span>
                    </div>
                  )}
                </>
              )}
              {person.type === "staff" && (
                <>
                  <div className="kiosk__info-item">
                    <span className="kiosk__info-label">Shift</span>
                    <span className="kiosk__info-val">{person.shift}</span>
                  </div>
                  <div className="kiosk__info-item">
                    <span className="kiosk__info-label">Status</span>
                    <span className={`kiosk__info-val ${
                      person.status==="active" ? "kiosk__info-val--green" : "kiosk__info-val--red"
                    }`}>{person.status}</span>
                  </div>
                </>
              )}
            </div>

            <p className="kiosk__confirm-q">Is this you?</p>

            <div className="kiosk__confirm-btns">
              <button className="kiosk__btn kiosk__btn--secondary" onClick={reset}>
                ✕ Not Me
              </button>
              <button className="kiosk__btn kiosk__btn--primary" onClick={confirm}
                disabled={loading}>
                {loading ? <span className="spin">⟳</span> : "✓ Yes, Mark Attendance"}
              </button>
            </div>

            {/* Warn if member expired */}
            {person.type==="member" && person.status!=="active" && (
              <div className="kiosk__warn">
                ⚠ Your membership is <b>{person.status}</b>. Please contact the front desk.
              </div>
            )}
          </div>
        )}

        {/* ── SUCCESS STEP ── */}
        {step === "success" && result && (
          <div className="kiosk__card kiosk__card--success animate-in">
            <div className="kiosk__success-icon">
              {result.action==="check_in" ? "✓" : "✓"}
            </div>
            <h2 className="kiosk__success-title">
              {result.action==="check_in" ? "Checked In!" : "Checked Out!"}
            </h2>
            <div className="kiosk__success-name">{result.name}</div>
            <div className="kiosk__success-time">{result.time}</div>
            <div className="kiosk__success-date">{result.date}</div>
            <div className="kiosk__success-action">
              {result.action==="check_in"
                ? "✅ Entry recorded. Have a great workout!"
                : "✅ Exit recorded. See you next time!"}
            </div>
            <div className="kiosk__auto-reset">Resetting in 5 seconds…</div>
          </div>
        )}

        {/* ── ERROR STEP ── */}
        {step === "error" && (
          <div className="kiosk__card kiosk__card--error animate-in">
            <div className="kiosk__error-icon">✕</div>
            <h2 className="kiosk__error-title">Not Found</h2>
            <p className="kiosk__error-msg">{errMsg}</p>
            <button className="kiosk__btn kiosk__btn--primary" onClick={reset}>
              Try Again
            </button>
            <div className="kiosk__auto-reset">Resetting in 5 seconds…</div>
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="kiosk__footer">
        Need help? Ask the front desk &nbsp;|&nbsp; GymPro CRM
      </div>
    </div>
  );
}