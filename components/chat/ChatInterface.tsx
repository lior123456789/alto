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
  MortgageOfferLite,
  MortgageProfileLite,
} from "@/types";
import { MortgageOffersCard } from "./MortgageOffersCard";
import { ListingsCard } from "./ListingsCard";
import type { ListingResult } from "@/lib/realestate";

const INITIAL: ChatMessage = {
  role: "assistant",
  content:
    "Hey — I'm Alto. I help you find the best insurance, mortgage, or home deal without a broker taking a cut. What are you looking for?",
};

// Strip every special marker (markdown emphasis + control tags) so the
// rendered text is plain prose. Defense-in-depth: the system prompt also
// tells Claude not to emit markdown, but anything that slips through is
// neutralized here.
function stripDisplay(raw: string): string {
  return raw
    .replace(/<fetch_quotes>[\s\S]*?<\/fetch_quotes>/g, "")
    .replace(/<submit_lead>[\s\S]*?<\/submit_lead>/g, "")
    .replace(/<plaid_connect\s*\/?>/gi, "")
    .replace(/<recommend_mortgage>[\s\S]*?<\/recommend_mortgage>/g, "")
    .replace(/<fetch_listings>[\s\S]*?<\/fetch_listings>/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/(?<!_)_([^_\n]+)_(?!_)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*+]\s+/gm, "• ");
}

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
  const prevMessageCountRef = useRef(messages.length);

  // Scroll to bottom only when a NEW message arrives — not on every
  // typewriter tick, which previously caused scroll lag on long
  // conversations.
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      prevMessageCountRef.current = messages.length;
    }
  }, [messages.length]);

  // Separate, lighter effect to nudge during the typing of the FIRST
  // assistant chunk (so the screen doesn't sit looking still). Throttled
  // to once per second.
  const lastNudgeRef = useRef(0);
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    const now = Date.now();
    if (now - lastNudgeRef.current > 1000) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      lastNudgeRef.current = now;
    }
  }, [messages]);

  // Typewriter — advances the last assistant message's `revealedContent`
  // toward its full `content` at a paced rate. If the model is far ahead
  // of the typewriter, we chunk a few chars at a time so we don't lag.
  useEffect(() => {
    if (messages.length === 0) return;
    const lastIdx = messages.length - 1;
    const last = messages[lastIdx];
    if (last.role !== "assistant") return;
    const revealed = last.revealedContent ?? "";
    const full = last.content ?? "";
    if (revealed.length >= full.length) return;

    const lag = full.length - revealed.length;
    const charsToAdd = lag > 400 ? 6 : lag > 120 ? 3 : 1;
    const delayMs = lag > 400 ? 12 : lag > 120 ? 22 : 35; // ~30-80 cps

    const t = setTimeout(() => {
      setMessages((prev) => {
        const next = [...prev];
        const m = next[lastIdx];
        if (!m || m.role !== "assistant") return prev;
        const curRevealed = m.revealedContent ?? "";
        const curFull = m.content ?? "";
        if (curRevealed.length >= curFull.length) return prev;
        next[lastIdx] = {
          ...m,
          revealedContent: curFull.slice(0, curRevealed.length + charsToAdd),
        };
        return next;
      });
    }, delayMs);

    return () => clearTimeout(t);
  }, [messages]);

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

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "", revealedContent: "" },
        ]);
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
                const display = stripDisplay(assistantContent);
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

              if (
                parsed.type === "listings" &&
                Array.isArray(
                  (parsed as { listings?: ListingResult[] }).listings,
                )
              ) {
                const cast = parsed as unknown as {
                  listings: ListingResult[];
                  source: "rentcast" | "fallback";
                  fallbackUrls?: { name: string; url: string }[];
                };
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  return [
                    ...prev.slice(0, -1),
                    {
                      ...last,
                      listings: {
                        listings: cast.listings,
                        source: cast.source,
                        fallbackUrls: cast.fallbackUrls,
                      },
                    },
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

              if (
                parsed.type === "mortgage_offers" &&
                Array.isArray(
                  (parsed as { offers?: MortgageOfferLite[] }).offers,
                )
              ) {
                const cast = parsed as unknown as {
                  offers: MortgageOfferLite[];
                  profile: MortgageProfileLite;
                  baseRate?: number;
                  baseRateSource?: "fred" | "fallback";
                };
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  return [
                    ...prev.slice(0, -1),
                    {
                      ...last,
                      mortgageOffers: cast.offers,
                      mortgageProfile: cast.profile,
                      mortgageRateMeta:
                        cast.baseRate !== undefined && cast.baseRateSource
                          ? {
                              baseRate: cast.baseRate,
                              baseRateSource: cast.baseRateSource,
                            }
                          : undefined,
                    },
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
    <div className="flex flex-col h-screen w-full bg-black text-white relative overflow-hidden">
      {/* Header */}
      <header className="relative z-10 px-6 py-4 flex items-center justify-between border-b border-white/[0.04]">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </Link>
        <div className="flex items-center gap-2.5">
          <AltoAvatar size={28} />
          <span className="text-[15px] font-semibold tracking-tight">Alto</span>
        </div>
        <div className="flex items-center gap-5">
          <Link
            href="/billing"
            className="text-sm font-medium text-white/60 hover:text-white"
          >
            Pricing
          </Link>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto relative z-10">
        <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
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
              {message.listings && (
                <div className="ml-10">
                  <ListingsCard
                    listings={message.listings.listings}
                    source={message.listings.source}
                    fallbackUrls={message.listings.fallbackUrls}
                  />
                </div>
              )}
              {message.mortgageOffers && message.mortgageProfile && (
                <div className="ml-10">
                  <MortgageOffersCard
                    offers={message.mortgageOffers}
                    profile={message.mortgageProfile}
                    baseRate={message.mortgageRateMeta?.baseRate}
                    baseRateSource={message.mortgageRateMeta?.baseRateSource}
                  />
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
      <div className="relative z-10 px-6 pb-8 pt-4 bg-gradient-to-t from-black via-black to-transparent">
        <div className="max-w-2xl mx-auto">
          {showQuickReplies && (
            <motion.div
              className="mb-4 flex flex-wrap gap-2 justify-center"
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
                  className="text-[13px] px-3.5 py-1.5 rounded-full border border-white/10 text-white/70 hover:bg-white/[0.04] hover:text-white hover:border-white/20 transition-all"
                >
                  {opt}
                </motion.button>
              ))}
            </motion.div>
          )}

          <div className="relative bg-[#0d0d10] border border-white/[0.08] rounded-3xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.8)] focus-within:border-white/20 focus-within:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_8px_40px_-12px_rgba(56,189,248,0.25)] transition-all">
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
              placeholder="Message Alto…"
              rows={1}
              className="w-full bg-transparent border-none px-5 pt-4 pb-2 text-[16px] leading-relaxed text-white placeholder:text-white/35 focus:outline-none resize-none"
              style={{ maxHeight: 200 }}
              onInput={(e) => {
                const t = e.currentTarget;
                t.style.height = "auto";
                t.style.height = `${Math.min(t.scrollHeight, 200)}px`;
              }}
            />
            <div className="flex items-center justify-end px-3 pb-3">
              <motion.button
                onClick={() => sendMessage()}
                disabled={submitDisabled}
                whileTap={{ scale: 0.94 }}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                  submitDisabled
                    ? "bg-white/[0.05] text-white/30"
                    : "bg-white text-black hover:bg-white/95 shadow-[0_0_24px_-6px_rgba(255,255,255,0.5)]"
                }`}
                aria-label="Send"
              >
                <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

