"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUp, ArrowLeft } from "lucide-react";
import { MessageBubble, AltoAvatar } from "./MessageBubble";
import { QuoteCard } from "./QuoteCard";
import { TypingIndicator } from "./TypingIndicator";
import { CallCard } from "./CallCard";
import { PlaidLinkCard } from "./PlaidLinkCard";
import type {
  ChatMessage,
  InsuranceQuote,
  LeadAccepted,
  PlaidSummary,
} from "@/types";

const INITIAL: ChatMessage = {
  role: "assistant",
  content:
    "Hey — I'm Alto. I help you find the best insurance, mortgage, or home deal without a broker taking a cut. What are you looking for?",
};

const QUICK_REPLIES = [
  "Renters insurance",
  "Home insurance",
  "Auto insurance",
  "Get a mortgage",
];

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusLabel, setStatusLabel] = useState<string>("Thinking");
  const [sessionId] = useState(() =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2),
  );
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const searchParams = useSearchParams();
  const initialQuery = searchParams?.get("q") ?? null;
  const autoSentRef = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = useCallback(
    async (override?: string) => {
      const text = (override ?? input).trim();
      if (!text || isLoading) return;

      const userMessage: ChatMessage = { role: "user", content: text };
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setInput("");
      setIsLoading(true);
      setStatusLabel("Thinking");

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: newMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            sessionId,
          }),
        });
        if (!response.body) throw new Error("No stream");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantContent = "";

        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
        setIsLoading(false);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value);
          const lines = text.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data) as {
                chunk?: string;
                type?: string;
                quotes?: InsuranceQuote[];
                uuid?: string;
                callNumber?: string | null;
                durationSeconds?: number;
                earnedDollars?: string;
                vertical?: LeadAccepted["vertical"];
                reason?: string;
                error?: string;
              };

              if (parsed.chunk) {
                assistantContent += parsed.chunk;
                const display = assistantContent
                  .replace(/<fetch_quotes>[\s\S]*?<\/fetch_quotes>/g, "")
                  .replace(/<submit_lead>[\s\S]*?<\/submit_lead>/g, "")
                  .replace(/<plaid_connect\s*\/?>/gi, "");
                setMessages((prev) => [
                  ...prev.slice(0, -1),
                  { ...prev[prev.length - 1], content: display },
                ]);
              }

              if (parsed.type === "quotes" && parsed.quotes) {
                const quotes = parsed.quotes;
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  return [
                    ...prev.slice(0, -1),
                    { ...last, quotes },
                  ];
                });
              }

              if (
                parsed.type === "lead_accepted" &&
                parsed.uuid &&
                parsed.vertical
              ) {
                const leadAccepted: LeadAccepted = {
                  uuid: parsed.uuid,
                  callNumber: parsed.callNumber ?? null,
                  durationSeconds: parsed.durationSeconds ?? 60,
                  earnedDollars: parsed.earnedDollars ?? "0",
                  vertical: parsed.vertical,
                };
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  return [
                    ...prev.slice(0, -1),
                    { ...last, leadAccepted },
                  ];
                });
              }

              if (parsed.type === "plaid_connect") {
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  return [
                    ...prev.slice(0, -1),
                    { ...last, plaidConnect: true },
                  ];
                });
              }
            } catch {
              /* parse errors are non-fatal */
            }
          }
        }
      } catch (err) {
        console.error("Chat error:", err);
        setIsLoading(false);
      }
    },
    [input, messages, isLoading, sessionId],
  );

  useEffect(() => {
    if (initialQuery && !autoSentRef.current) {
      autoSentRef.current = true;
      sendMessage(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const handlePlaidLinked = useCallback(
    (summary: PlaidSummary) => {
      // Stamp the summary onto the message that contained the Plaid card
      setMessages((prev) => {
        const next = [...prev];
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i].plaidConnect) {
            next[i] = { ...next[i], plaidSummary: summary };
            break;
          }
        }
        return next;
      });

      // Feed the result back to Claude as a system-style user note
      const summaryNote = `[Plaid summary] cash:$${summary.totalCash}, total assets:$${summary.totalAssets}, monthly income:$${summary.monthlyIncomeEstimate}, annual income:$${summary.annualIncomeEstimate}, accounts:${summary.accountCount}, primary:${summary.primaryAccount ?? "—"}. Use these numbers to recommend mortgage options.`;
      sendMessage(summaryNote);
    },
    [sendMessage],
  );

  const submitDisabled = isLoading || !input.trim();
  const showQuickReplies = messages.length === 1 && !isLoading;

  return (
    <div className="flex flex-col h-screen w-full bg-[#050507] text-white relative overflow-hidden">
      {/* Subtle ambient glow */}
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-sky-500/10 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <header className="relative z-10 px-5 py-4 border-b border-white/[0.05] flex items-center justify-between backdrop-blur-md bg-black/30">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <div className="flex items-center gap-2.5">
          <AltoAvatar size={26} />
          <div className="text-left">
            <div className="text-sm font-semibold leading-none">Alto</div>
            <div className="text-[11px] text-white/40 mt-0.5">
              {isLoading ? statusLabel : "Online · No broker, no commission"}
            </div>
          </div>
        </div>
        <div className="w-12" />
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto relative z-10">
        <div className="max-w-2xl mx-auto px-5 py-8 space-y-7">
          {messages.map((message, i) => (
            <div key={i} className="space-y-4">
              <MessageBubble message={message} />
              {message.plaidConnect && !message.plaidSummary && (
                <div className="ml-10">
                  <PlaidLinkCard
                    sessionId={sessionId}
                    onLinked={handlePlaidLinked}
                  />
                </div>
              )}
              {message.plaidSummary && (
                <div className="ml-10">
                  <PlaidLinkCard
                    sessionId={sessionId}
                    onLinked={handlePlaidLinked}
                  />
                </div>
              )}
              {message.leadAccepted && (
                <div className="ml-10">
                  <CallCard lead={message.leadAccepted} />
                </div>
              )}
              {message.quotes && message.quotes.length > 0 && (
                <div className="ml-10 space-y-3">
                  {message.quotes.map((quote, j) => (
                    <QuoteCard
                      key={quote.provider}
                      quote={quote}
                      isRecommended={j === 0}
                      conversationId={sessionId}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
          {isLoading && <TypingIndicator label={statusLabel} />}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Composer */}
      <div className="relative z-10 px-5 pb-6 pt-3 bg-gradient-to-t from-[#050507] via-[#050507] to-transparent">
        <div className="max-w-2xl mx-auto">
          {showQuickReplies && (
            <motion.div
              className="mb-3 flex flex-wrap gap-2 justify-center"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {QUICK_REPLIES.map((opt, i) => (
                <motion.button
                  key={opt}
                  onClick={() => sendMessage(opt)}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.05 }}
                  className="text-sm px-4 py-2 rounded-full border border-white/10 text-white/70 hover:bg-white/5 hover:text-white hover:border-white/20 transition-all"
                >
                  {opt}
                </motion.button>
              ))}
            </motion.div>
          )}

          <div className="bg-white/[0.04] border border-white/10 rounded-2xl backdrop-blur-md focus-within:border-sky-400/40 focus-within:bg-white/[0.06] transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Tell Alto what you need…"
              rows={1}
              className="w-full bg-transparent border-none px-4 pt-4 pb-2 text-[15px] text-white placeholder:text-white/30 focus:outline-none resize-none"
              style={{ maxHeight: 200 }}
              onInput={(e) => {
                const t = e.currentTarget;
                t.style.height = "auto";
                t.style.height = `${Math.min(t.scrollHeight, 200)}px`;
              }}
            />
            <div className="flex items-center justify-between px-3 pb-3">
              <div className="text-[11px] text-white/30">
                ⏎ to send · ⇧⏎ for new line
              </div>
              <motion.button
                onClick={() => sendMessage()}
                disabled={submitDisabled}
                whileTap={{ scale: 0.94 }}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  submitDisabled
                    ? "bg-white/[0.05] text-white/30"
                    : "bg-white text-black hover:bg-white/90 shadow-[0_0_20px_-4px_rgba(255,255,255,0.4)]"
                }`}
                aria-label="Send"
              >
                <ArrowUp className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

