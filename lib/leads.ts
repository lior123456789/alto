import { createClient } from "@/lib/supabase";

const REFERRAL_FEES: Record<string, number> = {
  Lemonade: 75,
  Progressive: 90,
  "State Farm": 85,
  "Rocket Mortgage": 1500,
  "Better.com": 1200,
  Opendoor: 3000,
};

export async function trackLead(params: {
  conversationId: string;
  provider: string;
  vertical: string;
  monthlyPrice: number;
}) {
  const supabase = createClient();
  if (!supabase) return; // No-op until Supabase is wired up.

  const fee = REFERRAL_FEES[params.provider] ?? 50;

  await supabase.from("leads").insert({
    conversation_id: params.conversationId,
    provider: params.provider,
    vertical: params.vertical,
    status: "clicked",
    referral_fee: fee,
  });
}
