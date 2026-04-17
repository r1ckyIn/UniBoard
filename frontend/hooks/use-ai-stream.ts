import { useState, useCallback, useRef, useEffect } from "react";
import { streamAiResponse, type CitationSource } from "@/lib/api/ai-stream";
import { useAuthStore } from "@/lib/auth/store";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface UseAiStreamReturn {
  messages: ChatMessage[];
  sources: CitationSource[]; // Phase 34 AIFEAT-02 — citations for latest assistant answer
  isStreaming: boolean;
  status: string | null; // "searching" | "analyzing" | null
  error: string | null;
  sendMessage: (question: string) => void;
  clearMessages: () => void;
}

/**
 * Hook for SSE streaming AI chat.
 * Manages multi-turn chat state in memory (D-05: no DB persistence).
 * AbortController cancels stream on unmount (Pitfall 5).
 */
export function useAiStream(
  courseId: string,
  language: string = "en",
): UseAiStreamReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sources, setSources] = useState<CitationSource[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Track messages via ref to avoid stale closure in sendMessage
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const sendMessage = useCallback(
    (question: string) => {
      // Abort any existing stream
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const userMessage: ChatMessage = { role: "user", content: question };
      setMessages((prev) => [...prev, userMessage]);
      setSources([]); // Phase 34 AIFEAT-02 — clear stale citations from prior question
      setIsStreaming(true);
      setStatus("searching");
      setError(null);

      // Build history from existing messages for multi-turn
      const history = messagesRef.current.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const token = useAuthStore.getState().accessToken;
      const url = `/api/v1/courses/${courseId}/qa/stream`;

      let assistantContent = "";

      const run = async () => {
        try {
          // Add empty assistant message that will be updated
          setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

          for await (const event of streamAiResponse(
            url,
            { question, history, search_more: false, language },
            token,
            controller.signal,
          )) {
            if (event.event === "status") {
              setStatus(event.data.phase as string);
            } else if (event.event === "sources") {
              // Phase 34 AIFEAT-02 — RAG citations arrive BEFORE first token
              setSources(event.data.sources as CitationSource[]);
            } else if (event.event === "token") {
              assistantContent += event.data.text as string;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: assistantContent,
                };
                return updated;
              });
              setStatus(null); // Clear status once tokens start flowing
            } else if (event.event === "done") {
              setIsStreaming(false);
              setStatus(null);
            } else if (event.event === "error") {
              setError(event.data.message as string);
              setIsStreaming(false);
              setStatus(null);
            }
          }
        } catch (err) {
          if ((err as Error).name !== "AbortError") {
            setError((err as Error).message);
          }
        } finally {
          setIsStreaming(false);
          setStatus(null);
        }
      };

      run();
    },
    [courseId, language],
  );

  const clearMessages = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setSources([]); // Phase 34 AIFEAT-02 — drop citation panel when chat is cleared
    setIsStreaming(false);
    setStatus(null);
    setError(null);
  }, []);

  return {
    messages,
    sources,
    isStreaming,
    status,
    error,
    sendMessage,
    clearMessages,
  };
}
