"use client";

import { getFirebaseDb } from "@/lib/firebase";
import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";

export async function joinWaitlist(email: string, source = "landing") {
  const cleaned = email.trim().toLowerCase();
  if (!cleaned || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
    throw new Error("Please enter a valid email");
  }
  const db = getFirebaseDb();
  if (!db) {
    // No Firestore configured — keep locally so we don't lose the signup.
    if (typeof window !== "undefined") {
      const key = "alto.waitlist.local";
      const list = JSON.parse(
        window.localStorage.getItem(key) ?? "[]",
      ) as string[];
      if (!list.includes(cleaned)) list.push(cleaned);
      window.localStorage.setItem(key, JSON.stringify(list));
    }
    return;
  }
  await addDoc(collection(db, "waitlist"), {
    email: cleaned,
    source,
    createdAt: serverTimestamp(),
    userAgent:
      typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
  });
}
