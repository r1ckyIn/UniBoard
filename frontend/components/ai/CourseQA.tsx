"use client";

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import RoughCard from "@/components/design-system/RoughCard";
import { useAskQuestion } from "@/lib/hooks/useAI";

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: string[];
  method?: string;
}

interface CourseQAProps {
  courseId: string;
}

/**
 * Chat-like Q&A interface for asking AI about course materials.
 * Shows inline citations and method indicator (direct/RAG).
 */
export default function CourseQA({ courseId }: CourseQAProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const mutation = useAskQuestion(courseId);

  useEffect(() => {
    // jsdom doesn't implement scrollTo — guard for test environments
    if (scrollRef.current && typeof scrollRef.current.scrollTo === "function") {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  const handleSubmit = () => {
    const question = input.trim();
    if (!question || mutation.isPending) return;

    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");

    mutation.mutate(
      { question },
      {
        onSuccess: (data) => {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: data.answer,
              citations: data.citations,
              method: data.method,
            },
          ]);
        },
        onError: () => {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: "Sorry, I could not process your question. Please try again." },
          ]);
        },
      }
    );
  };

  return (
    <RoughCard className="p-5 bg-[var(--color-card-bg)]">
      <h3
        className="text-lg mb-4"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        AI Q&A
      </h3>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="space-y-3 mb-4 overflow-y-auto"
        style={{ maxHeight: "400px" }}
      >
        {messages.length === 0 && (
          <p className="text-sm" style={{ color: "var(--color-text-3)" }}>
            Ask a question about your course materials to get started.
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className="max-w-[80%] rounded-lg px-3 py-2 text-sm"
              style={{
                backgroundColor:
                  msg.role === "user"
                    ? "var(--color-orange-soft)"
                    : "var(--color-cream)",
                border: msg.role === "assistant" ? "1px solid var(--color-divider)" : "none",
              }}
            >
              {/* Method badge */}
              {msg.method && (
                <span
                  className="inline-block px-1.5 py-0.5 rounded text-[10px] uppercase font-medium mb-1"
                  style={{
                    backgroundColor: "var(--color-blue-soft)",
                    color: "var(--color-blue)",
                  }}
                >
                  {msg.method === "direct_context" ? "direct" : "RAG"}
                </span>
              )}
              <p style={{ whiteSpace: "pre-wrap" }}>{msg.content}</p>
              {/* Citations */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {msg.citations.map((cite, j) => (
                    <span
                      key={j}
                      className="inline-block px-2 py-0.5 rounded-full text-[10px]"
                      data-testid="citation-pill"
                      style={{
                        backgroundColor: "var(--color-blue-soft)",
                        color: "var(--color-blue)",
                      }}
                    >
                      {cite}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {mutation.isPending && (
          <div className="flex justify-start">
            <div
              className="rounded-lg px-3 py-2 text-sm"
              style={{ backgroundColor: "var(--color-cream)", border: "1px solid var(--color-divider)" }}
            >
              <span className="animate-pulse">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Ask about your course materials..."
          maxLength={1000}
          rows={2}
          className="flex-1 resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none"
          style={{
            borderColor: "var(--color-divider)",
            backgroundColor: "var(--color-cream)",
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || mutation.isPending}
          className="self-end rounded-lg px-3 py-2 transition-opacity disabled:opacity-40"
          style={{ backgroundColor: "var(--color-orange)", color: "white" }}
          aria-label="Send question"
        >
          <Send size={16} />
        </button>
      </div>
    </RoughCard>
  );
}
