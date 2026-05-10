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
        <div className="max-w-[80%] px-4 py-2.5 rounded-2xl bg-white text-black text-[15px] leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
      </motion.div>
    );
  }

  // Alto message — avatar + name + content, no bubble.
  return (
    <motion.div
      className="flex gap-3"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <AltoAvatar />
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[13px] font-medium text-white">Alto</span>
          <span className="text-[11px] text-white/30">AI</span>
        </div>
        <div className="text-[15px] leading-relaxed text-white/90 whitespace-pre-wrap">
          {message.content || (
            <span className="text-white/30">…</span>
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
