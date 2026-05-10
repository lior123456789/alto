"use client";
import { motion } from "framer-motion";
import { AltoAvatar } from "./MessageBubble";

export function TypingIndicator({ label = "Thinking" }: { label?: string }) {
  return (
    <motion.div
      className="flex gap-3 items-start"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <AltoAvatar />
      <div className="pt-1.5">
        <div className="text-[13px] font-medium text-white mb-1">Alto</div>
        <div className="inline-flex items-center gap-2 text-[14px] text-white/60">
          <span>{label}</span>
          <span className="flex gap-0.5">
            {[1, 2, 3].map((i) => (
              <motion.span
                key={i}
                className="w-1 h-1 rounded-full bg-white/60"
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.15,
                }}
              />
            ))}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
