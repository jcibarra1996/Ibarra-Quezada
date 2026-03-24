"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_TOPICS = [
  { label: "🏎️ Equipos 2025", prompt: "Explícame los 10 equipos de la parrilla de F1 en 2025: sus nombres, motores que usan, pilotos principales y una característica especial de cada uno." },
  { label: "🏁 Fin de semana", prompt: "¿Cómo es la estructura de un fin de semana de Fórmula 1? Explícame el formato estándar y el formato Sprint." },
  { label: "📋 Reglas básicas", prompt: "¿Cuáles son las reglas más importantes que debe conocer un rookie de F1? Empieza por el sistema de puntos, las banderas y las penalizaciones principales." },
  { label: "🛞 Neumáticos", prompt: "Explícame todo sobre los neumáticos de Fórmula 1: los tipos de compuestos, cómo funciona la estrategia de pit stops y por qué los neumáticos son tan importantes en una carrera." },
  { label: "🗺️ Circuitos", prompt: "¿Cuáles son los circuitos más importantes e icónicos del calendario de F1? Dime sus características principales y qué los hace únicos." },
  { label: "⚡ Power Unit", prompt: "Explícame cómo funciona la Power Unit de un monoplaza de F1: el motor de combustión, el sistema híbrido ERS y por qué es tan complejo." },
  { label: "🌪️ Aerodinámica", prompt: "¿Cómo funciona la aerodinámica en un monoplaza de F1? Explícame el ground effect, el DRS y la diferencia entre downforce y drag." },
  { label: "🎯 Estrategia", prompt: "Explícame la estrategia de carrera en F1: cómo se decide cuándo entrar a pits, qué es el undercut y el overcut, y cómo influye el Safety Car en la estrategia." },
];

function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: "5px", alignItems: "center", padding: "4px 0" }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#E10600",
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function renderMarkdown(text: string): string {
  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Italic
  text = text.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Inline code
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
  // Headers
  text = text.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  text = text.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  text = text.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  // Horizontal rule
  text = text.replace(/^---$/gm, "<hr/>");
  // Blockquote
  text = text.replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>");
  // Unordered list
  text = text.replace(/^[\-\*] (.+)$/gm, "<li>$1</li>");
  text = text.replace(/(<li>[\s\S]+?<\/li>)/g, (match) => {
    if (!match.includes("<ul>")) return `<ul>${match}</ul>`;
    return match;
  });
  // Ordered list
  text = text.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");
  // Paragraphs: wrap bare lines
  text = text
    .split("\n\n")
    .map((block) => {
      if (
        block.startsWith("<h") ||
        block.startsWith("<ul") ||
        block.startsWith("<ol") ||
        block.startsWith("<li") ||
        block.startsWith("<blockquote") ||
        block.startsWith("<hr")
      ) {
        return block;
      }
      const trimmed = block.trim();
      if (!trimmed) return "";
      return `<p>${trimmed.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("\n");
  return text;
}

export default function F1Tutor() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, scrollToBottom]);

  const sendMessage = useCallback(
    async (userText: string) => {
      if (!userText.trim() || isLoading) return;

      const userMessage: Message = { role: "user", content: userText.trim() };
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setInput("");
      setIsLoading(true);
      setStreamingText("");

      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      abortRef.current = new AbortController();

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updatedMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok || !res.body) throw new Error("Error en la respuesta");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setStreamingText(accumulated);
        }

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: accumulated },
        ]);
        setStreamingText("");
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                "⚠️ Hubo un error al conectar con el tutor. Por favor intenta de nuevo.",
            },
          ]);
        }
        setStreamingText("");
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [messages, isLoading]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 180) + "px";
  };

  const allMessages = streamingText
    ? [
        ...messages,
        { role: "assistant" as const, content: streamingText, streaming: true },
      ]
    : messages;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        fontFamily: "var(--font)",
      }}
    >
      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-secondary)",
          flexShrink: 0,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Red stripe accent */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: "linear-gradient(90deg, #E10600 0%, #FF4500 50%, #E10600 100%)",
          }}
        />
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          {/* F1 logo */}
          <div
            style={{
              background: "var(--f1-red)",
              color: "#fff",
              fontWeight: 900,
              fontSize: "0.85rem",
              padding: "5px 10px",
              borderRadius: 4,
              letterSpacing: "0.05em",
              flexShrink: 0,
            }}
          >
            F1
          </div>
          <div>
            <h1
              style={{
                fontSize: "1.05rem",
                fontWeight: 700,
                letterSpacing: "-0.01em",
              }}
            >
              Nico Paddock
              <span
                style={{
                  marginLeft: 10,
                  fontSize: "0.7rem",
                  fontWeight: 500,
                  color: "#22C55E",
                  background: "rgba(34,197,94,0.1)",
                  padding: "2px 8px",
                  borderRadius: 20,
                  letterSpacing: "0.03em",
                }}
              >
                ● EN LÍNEA
              </span>
            </h1>
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                marginTop: 2,
              }}
            >
              Tu maestro personal de Fórmula 1 · Powered by Claude
            </p>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 20px",
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          {/* Welcome state */}
          {allMessages.length === 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "50vh",
                gap: 24,
                textAlign: "center",
                padding: "20px 0",
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 80,
                  background: "var(--bg-card)",
                  border: "2px solid var(--border-red)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "2.2rem",
                  boxShadow: "0 0 30px var(--f1-red-glow)",
                }}
              >
                🏎️
              </div>
              <div>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 8 }}>
                  ¡Bienvenido al Paddock!
                </h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", maxWidth: 480, lineHeight: 1.6 }}>
                  Soy <strong style={{ color: "var(--text-primary)" }}>Nico Paddock</strong>, tu maestro de Fórmula 1.
                  Pregúntame lo que quieras o elige un tema para empezar.
                </p>
              </div>

              {/* Quick topic grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                  gap: 10,
                  width: "100%",
                  maxWidth: 700,
                }}
              >
                {QUICK_TOPICS.map((topic) => (
                  <button
                    key={topic.label}
                    onClick={() => sendMessage(topic.prompt)}
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: "12px 14px",
                      color: "var(--text-primary)",
                      fontSize: "0.82rem",
                      fontWeight: 500,
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s ease",
                      lineHeight: 1.4,
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget;
                      el.style.borderColor = "var(--f1-red)";
                      el.style.background = "var(--bg-card-hover)";
                      el.style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget;
                      el.style.borderColor = "var(--border)";
                      el.style.background = "var(--bg-card)";
                      el.style.transform = "none";
                    }}
                  >
                    {topic.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          {allMessages.map((msg, idx) => {
            const isUser = msg.role === "user";
            const isStreaming = "streaming" in msg && msg.streaming;
            return (
              <div
                key={idx}
                className="msg-animate"
                style={{
                  display: "flex",
                  flexDirection: isUser ? "row-reverse" : "row",
                  gap: 12,
                  marginBottom: 20,
                  alignItems: "flex-start",
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1rem",
                    background: isUser
                      ? "linear-gradient(135deg, #2D3561, #1A1A2E)"
                      : "var(--f1-red)",
                    border: isUser
                      ? "1px solid var(--user-bubble-border)"
                      : "1px solid rgba(225,6,0,0.4)",
                    marginTop: 2,
                  }}
                >
                  {isUser ? "👤" : "🏎️"}
                </div>

                {/* Bubble */}
                <div
                  style={{
                    maxWidth: "78%",
                    background: isUser ? "var(--user-bubble)" : "var(--bg-card)",
                    border: isUser
                      ? "1px solid var(--user-bubble-border)"
                      : "1px solid var(--border)",
                    borderRadius: isUser ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
                    padding: "12px 16px",
                    fontSize: "0.9rem",
                    lineHeight: 1.65,
                  }}
                >
                  {isUser ? (
                    <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{msg.content}</p>
                  ) : (
                    <div>
                      <div
                        className="message-content"
                        dangerouslySetInnerHTML={{
                          __html: renderMarkdown(msg.content),
                        }}
                      />
                      {isStreaming && <TypingIndicator />}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Loading (before stream starts) */}
          {isLoading && !streamingText && (
            <div
              style={{
                display: "flex",
                gap: 12,
                marginBottom: 20,
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1rem",
                  background: "var(--f1-red)",
                  border: "1px solid rgba(225,6,0,0.4)",
                  marginTop: 2,
                }}
              >
                🏎️
              </div>
              <div
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "4px 18px 18px 18px",
                  padding: "14px 18px",
                }}
              >
                <TypingIndicator />
              </div>
            </div>
          )}

          {/* Quick topics shown after first message too */}
          {allMessages.length > 0 && !isLoading && (
            <div
              style={{
                marginTop: 8,
                marginBottom: 4,
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {QUICK_TOPICS.slice(0, 4).map((topic) => (
                <button
                  key={topic.label}
                  onClick={() => sendMessage(topic.prompt)}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--border)",
                    borderRadius: 20,
                    padding: "5px 12px",
                    color: "var(--text-secondary)",
                    fontSize: "0.78rem",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--f1-red)";
                    e.currentTarget.style.color = "var(--text-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }}
                >
                  {topic.label}
                </button>
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div
        style={{
          borderTop: "1px solid var(--border)",
          background: "var(--bg-secondary)",
          padding: "14px 20px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            display: "flex",
            gap: 10,
            alignItems: "flex-end",
          }}
        >
          <div style={{ flex: 1, position: "relative" }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Pregunta sobre equipos, reglas, circuitos, estrategia..."
              rows={1}
              disabled={isLoading}
              style={{
                width: "100%",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "11px 14px",
                color: "var(--text-primary)",
                fontSize: "0.9rem",
                resize: "none",
                outline: "none",
                fontFamily: "var(--font)",
                lineHeight: 1.5,
                transition: "border-color 0.15s",
                minHeight: 44,
                maxHeight: 180,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--f1-red)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            />
          </div>

          <button
            onClick={() => sendMessage(input)}
            disabled={isLoading || !input.trim()}
            style={{
              background: isLoading || !input.trim() ? "#2A2A2A" : "var(--f1-red)",
              border: "none",
              borderRadius: 12,
              width: 44,
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: isLoading || !input.trim() ? "not-allowed" : "pointer",
              flexShrink: 0,
              transition: "all 0.15s",
              fontSize: "1.1rem",
            }}
            onMouseEnter={(e) => {
              if (!isLoading && input.trim())
                e.currentTarget.style.background = "var(--f1-red-dark)";
            }}
            onMouseLeave={(e) => {
              if (!isLoading && input.trim())
                e.currentTarget.style.background = "var(--f1-red)";
            }}
          >
            {isLoading ? (
              <div
                style={{
                  width: 18,
                  height: 18,
                  border: "2px solid #444",
                  borderTopColor: "#fff",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
            ) : (
              "→"
            )}
          </button>
        </div>

        <p
          style={{
            textAlign: "center",
            fontSize: "0.72rem",
            color: "var(--text-muted)",
            marginTop: 10,
          }}
        >
          Enter para enviar · Shift+Enter para nueva línea
        </p>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
