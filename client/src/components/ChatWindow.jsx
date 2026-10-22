import { useState, useEffect, useRef, useMemo } from "react";
import { askQuestion, getChatHistory } from "../services/api";
import { downloadCSV, fmt } from "../utils";
import ResultChart from "./ResultChart";

const SR = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

function buildSuggestions(columns = []) {
  const num = columns.filter((c) => c.type === "number").map((c) => c.name);
  const cat = columns.filter((c) => c.type === "string").map((c) => c.name);
  const date = columns.filter((c) => c.type === "date").map((c) => c.name);
  const s = [];
  if (num[0] && cat[0]) s.push(`What is the total ${num[0]} by ${cat[0]}?`, `Top 5 ${cat[0]} by average ${num[0]}`);
  if (num[0] && date[0]) s.push(`Show the ${num[0]} trend by month`);
  if (cat[1]) s.push(`How many rows are there for each ${cat[1]}?`);
  if (num[1] && cat[0]) s.push(`Compare ${num[0]} and ${num[1]} across ${cat[0]}`);
  return s.slice(0, 4);
}

export default function ChatWindow({ dataset, onPin, isPinned, pendingQuestion, onConsumed }) {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState({});
  const [copied, setCopied] = useState(null);
  const [listening, setListening] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const recRef = useRef(null);
  const pendingRef = useRef(pendingQuestion);
  const suggestions = useMemo(() => buildSuggestions(dataset.columns), [dataset]);

  useEffect(() => {
    let cancelled = false;
    setMessages([]);
    getChatHistory(dataset.id)
      .then((h) => { if (!cancelled) setMessages(h.map((m) => ({ role: m.role, content: m.content, pipeline: m.pipeline, result: m.resultPreview }))); })
      .catch(() => {})
      .finally(() => {
        if (cancelled) return;
        const q = pendingRef.current; // a question sent over from the AI Summary tab
        if (q) { pendingRef.current = null; ask(q); onConsumed?.(); }
      });
    return () => { cancelled = true; };
  }, [dataset.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  useEffect(() => {
    const onKey = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); inputRef.current?.focus(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function ask(text) {
    const q = (text ?? question).trim();
    if (!q || loading) return;
    setMessages((p) => [...p, { role: "user", content: q }]);
    setQuestion("");
    setLoading(true);
    try {
      const d = await askQuestion(dataset.id, q);
      setMessages((p) => [...p, { role: "assistant", content: d.answer, pipeline: d.pipeline, result: d.result, failed: !!d.error }]);
    } catch (err) {
      setMessages((p) => [...p, { role: "assistant", failed: true, content: err.response?.data?.error || "Couldn't reach the server. Check that the backend is running." }]);
    } finally {
      setLoading(false);
    }
  }

  function toggleVoice() {
    if (!SR) return;
    if (listening) return recRef.current?.stop();
    const r = new SR();
    r.lang = "en-US";
    r.onresult = (e) => setQuestion(e.results[0][0].transcript);
    r.onend = () => setListening(false);
    recRef.current = r;
    r.start();
    setListening(true);
  }

  function copy(text, i) {
    navigator.clipboard?.writeText(text);
    setCopied(i);
    setTimeout(() => setCopied(null), 1400);
  }

  const rowsOf = (m) => (Array.isArray(m.result) && m.result.length > 0 ? m.result : null);

  return (
    <>
      <div className="messages">
        {messages.length === 0 && (
          <div className="welcome">
            <h2>What would you like to know about {dataset.originalFileName}?</h2>
            <p>Ask in plain English. Every answer shows the query it ran, so you can verify it.</p>
            <div className="chips">
              {suggestions.map((s) => <button key={s} className="chip" onClick={() => ask(s)}>{s}</button>)}
            </div>
          </div>
        )}

        {messages.map((m, i) => {
          const rows = rowsOf(m);
          return (
            <div key={i} className={`msg ${m.role}`}>
              <div className={`bubble ${m.failed ? "failed" : ""}`}>
                <p>{m.content}</p>

                {rows && (
                  <>
                    <div className="table-wrap">
                      <table>
                        <thead><tr>{Object.keys(rows[0]).filter((k) => k !== "_id").map((k) => <th key={k}>{k}</th>)}</tr></thead>
                        <tbody>
                          {rows.slice(0, 10).map((r, ri) => (
                            <tr key={ri}>{Object.entries(r).filter(([k]) => k !== "_id").map(([k, v]) => <td key={k}>{fmt(v)}</td>)}</tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <ResultChart result={rows} />
                  </>
                )}

                {m.role === "assistant" && (
                  <div className="actions">
                    <button onClick={() => copy(m.content, i)}>{copied === i ? "Copied" : "Copy answer"}</button>
                    {rows && <button onClick={() => downloadCSV(rows, "datapulse-result")}>Export CSV</button>}
                    {rows && onPin && (() => {
                      const title = messages[i - 1]?.content || "Result";
                      return <button onClick={() => onPin({ title, answer: m.content, rows: rows.slice(0, 50) })} disabled={isPinned(title)}>{isPinned(title) ? "Pinned ✓" : "Pin to dashboard"}</button>;
                    })()}
                    {m.pipeline && <button onClick={() => setOpen((o) => ({ ...o, [i]: !o[i] }))}>{open[i] ? "Hide query" : "View query"}</button>}
                  </div>
                )}
                {m.pipeline && open[i] && <pre className="code">{JSON.stringify(m.pipeline, null, 2)}</pre>}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="msg assistant">
            <div className="bubble"><div className="typing"><span /><span /><span /></div></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="composer">
        {messages.length > 0 && suggestions.length > 0 && (
          <div className="chips tight">
            {suggestions.slice(0, 3).map((s) => <button key={s} className="chip sm" onClick={() => ask(s)}>{s}</button>)}
          </div>
        )}
        <div className="input-row">
          <input
            ref={inputRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
            placeholder="Ask a question about your data…"
            disabled={loading}
          />
          {SR && <button className={`icon-btn ${listening ? "rec" : ""}`} onClick={toggleVoice} title="Voice input">{listening ? "●" : "🎤"}</button>}
          <button className="btn-primary" onClick={() => ask()} disabled={loading || !question.trim()}>Ask</button>
        </div>
        <span className="hint">Press Ctrl + K to focus · Enter to send</span>
      </div>
    </>
  );
}