"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { AuthDialog } from "./AuthDialog";
import { signOut } from "@/lib/firebase";

export function AuthButton({ className }: { className?: string }) {
  const { user, configured } = useAuth();
  const [open, setOpen] = useState(false);

  if (!configured) return null;

  if (user) {
    return (
      <button
        onClick={() => signOut()}
        className={
          className ??
          "text-sm font-medium text-white/70 hover:text-white"
        }
      >
        Sign out
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          className ??
          "text-sm font-medium text-white/70 hover:text-white"
        }
      >
        Sign in
      </button>
      <AuthDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
