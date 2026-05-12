"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";

interface Props {
  message: string | null;
  onDismiss?: () => void;
  durationMs?: number;
}

export function Toast({ message, onDismiss, durationMs = 2400 }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!message) return;
    setShow(true);
    const t = setTimeout(() => {
      setShow(false);
      onDismiss?.();
    }, durationMs);
    return () => clearTimeout(t);
  }, [message, durationMs, onDismiss]);

  return (
    <AnimatePresence>
      {show && message && (
        <motion.div
          className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-2 bg-sky-500 text-white px-4 py-2.5 rounded-full text-sm font-medium shadow-[0_8px_32px_-8px_rgba(56,189,248,0.6)]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
        >
          <Check className="w-4 h-4" />
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
