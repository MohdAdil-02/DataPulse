import { useState, useEffect, useRef } from "react";
import { askQuestion, getChatHistory } from "../services/api";
import ResultChart from "./ResultChart";

export default function ChatWindow({ dataset }) {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [openPipelines, setOpenPipelines] = useState({});
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!dataset) return;
    getChatHistory(dataset.id)
      .then((history) =>
        setMessages(history.map((m) => ({ role: m.role, content: m.content, pipeline: m.pipeline })))
      )
      .catch(() => setMessages([]));
  }, [dataset]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleAsk() {
    if (!question.trim() || loading) return;

    const userMsg = { role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");
    setLoading(true);

    try {
      const data = await askQuestion(dataset.id, userMsg.content);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer, pipeline: data.pipeline, result: data.result },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${err.response?.data?.error || err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function togglePipeline(i) {
    setOpenPipelines((prev) => ({ ...prev, [i]: !prev[i] }));
  }

  return (
    <>
      <div className="messages">
        {messages.length === 0 && (
          <div className="msg-row assistant">
            <span className="msg-role">assistant</span>
            <div className="bubble">
              Ask me things like "total sales by category" or "show sales trend over time."
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`msg-row ${m.role}`}>
            <span className="msg-role">{m.role === "user" ? "you" : "assistant"}</span>
            <div className="bubble">
              {m.content}

              {m.pipeline && (
                <div className="pipeline-toggle" onClick={() => togglePipeline(i)}>
                  {openPipelines[i] ? "▾" : "▸"} view generated query
                </div>
              )}
              {m.pipeline && openPipelines[i] && (
                <div className="pipeline-code">{JSON.stringify(m.pipeline, null, 2)}</div>
              )}

              {m.result && Array.isArray(m.result) && m.result.length > 0 && (
                <>
                  <div className="result-table-wrap">
                    <table className="result-table">
                      <thead>
                        <tr>
                          {Object.keys(m.result[0]).filter(k => k !== "_id").map((k) => (
                            <th key={k}>{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {m.result.slice(0, 10).map((row, ri) => (
                          <tr key={ri}>
                            {Object.entries(row).filter(([k]) => k !== "_id").map(([k, v]) => (
                              <td key={k}>{String(v)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <ResultChart result={m.result} />
                </>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="msg-row assistant">
            <span className="msg-role">assistant</span>
            <div className="bubble">
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="input-row">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          placeholder="Ask a question about your data…"
          disabled={loading}
        />
        <button onClick={handleAsk} disabled={loading}>
          {loading ? "…" : "Ask"}
        </button>
      </div>
    </>
  );
}