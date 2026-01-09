import React, { useState, useRef } from "react";

export const ChatbotWidget: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [docs, setDocs] = useState<string[]>([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Leer solo archivos TXT
  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const texts: string[] = [];
    for (const file of Array.from(files)) {
      if (file.type === "text/plain") {
        const text = await file.text();
        texts.push(text);
      } else {
        alert("Solo se permiten archivos TXT.");
      }
    }
    setDocs(texts);
  };

  // Preguntar al backend usando el texto cargado como contexto
  const handleAsk = async () => {
    setLoading(true);
    const context = docs.join("\n").slice(0, 3000); // Limita tokens
    try {
      const res = await fetch("/chatbot/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, question }),
      });
      const data = await res.json();
      setAnswer(data.answer || data.error || "Sin respuesta");
    } catch (err) {
      setAnswer("Error de conexión con el backend");
    }
    setLoading(false);
  };

  return (
    <>
      {/* Botón flotante */}
      <button
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 1000,
          borderRadius: "50%",
          width: 56,
          height: 56,
          background: "#1976d2",
          color: "white",
          fontSize: 32,
          border: "none",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          cursor: "pointer",
        }}
        onClick={() => setOpen((v) => !v)}
        title="Abrir Chatbot"
      >
        💬
      </button>
      {/* Ventana de chat */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 90,
            right: 24,
            width: 350,
            maxWidth: "90vw",
            background: "white",
            borderRadius: 12,
            boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
            padding: 16,
            zIndex: 1001,
          }}
        >
          <div style={{ marginBottom: 8, fontWeight: "bold" }}>Chatbot IA (solo TXT, backend)</div>
          <input
            type="file"
            multiple
            accept=".txt"
            ref={fileInput}
            onChange={e => handleFiles(e.target.files)}
            style={{ marginBottom: 8 }}
          />
          <textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Pregunta..."
            style={{ width: "100%", minHeight: 40, marginBottom: 8 }}
          />
          <button
            onClick={handleAsk}
            disabled={!docs.length || !question || loading}
            style={{ width: "100%", marginBottom: 8 }}
          >
            {loading ? "Consultando..." : "Preguntar"}
          </button>
          <div style={{ minHeight: 40, background: "#f5f5f5", borderRadius: 6, padding: 8, whiteSpace: "pre-wrap" }}>
            <b>Respuesta:</b> {answer}
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{
              marginTop: 8,
              width: "100%",
              background: "#eee",
              border: "none",
              borderRadius: 6,
              padding: 6,
              cursor: "pointer",
            }}
          >
            Cerrar
          </button>
        </div>
      )}
    </>
  );
};