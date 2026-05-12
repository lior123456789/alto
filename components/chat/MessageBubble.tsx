"use client";

import { motion } from "framer-motion";
import type { ChatMessage } from "@/types";

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <motion.div
        className="flex justify-end"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <div className="max-w-[80%] px-5 py-3 rounded-3xl bg-white text-black text-[16px] leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
      </motion.div>
    );
  }

  // Alto message — avatar + name + content, no bubble.
  // Display revealedContent if present (typewriter effect mid-stream),
  // otherwise the full content.
  const display =
    message.revealedContent !== undefined
      ? message.revealedContent
      : message.content;
  const showCaret =
    message.revealedContent !== undefined &&
    message.revealedContent.length < message.content.length;

  return (
    <motion.div
      className="flex gap-3.5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <AltoAvatar size={32} />
      <div className="flex-1 min-w-0 pt-1">
        <div className="text-[13px] font-semibold text-white mb-2 tracking-tight">
          Alto
        </div>
        <div className="text-[16px] leading-[1.65] text-white/90 whitespace-pre-wrap">
          {display ? (
            <>
              {display}
              {showCaret && (
                <span className="inline-block w-[2px] h-[1em] bg-white/60 ml-[1px] align-[-2px] animate-pulse" />
              )}
            </>
          ) : (
            <span className="inline-flex items-center gap-1 text-white/40">
              <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function AltoAvatar({ size = 28 }: { size?: number }) {
  return (
    <div
      className="shrink-0 rounded-full bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center shadow-[0_0_16px_-4px_rgba(56,189,248,0.5)]"
      style={{ width: size, height: size }}
    >
      <span
        className="font-semibold text-white"
        style={{ fontSize: size * 0.45 }}
      >
        A
      </span>
    </div>
  );
}
