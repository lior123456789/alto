import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";
import type { ChatMessage } from "@/types";

let _browser: SupabaseClient | null = null;
let _server: SupabaseClient | null = null;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function createClient(): SupabaseClient | null {
  // Browser/anon — used from client components and API routes that don't need elevated perms.
  if (!url || !anon) return null;
  if (_browser) return _browser;
  _browser = createSupabaseClient(url, anon);
  return _browser;
}

export function createServerClient(): SupabaseClient | null {
  if (!url || !service) return null;
  if (_server) return _server;
  _server = createSupabaseClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _server;
}

export async function saveConversation(
  sessionId: string,
  messages: ChatMessage[],
  latestAssistantReply: string,
  userProfile: Record<string, unknown> = {},
) {
  const supabase = createServerClient();
  if (!supabase) return;

  const fullMessages = [
    ...messages,
    { role: "assistant" as const, content: latestAssistantReply },
  ];

  await supabase.from("conversations").upsert(
    {
      session_id: sessionId,
      vertical: "insurance",
      messages: fullMessages,
      user_profile: userProfile,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id" },
  );
}
