import { NextRequest, NextResponse } from "next/server";
import { streamChatResponse } from "@/lib/claude";
import { fetchInsuranceQuotes } from "@/lib/insurance";
import {
  submitLeadToEverQuote,
  isEverQuoteConfigured,
  type AltoUserProfile,
} from "@/lib/everquote";
import { saveConversation, createServerClient } from "@/lib/supabase";
import {
  buildMortgageOffers,
  type MortgageProfile,
} from "@/lib/mortgage";
import type { ChatMessage, FetchQuotesParams } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    messages: ChatMessage[];
    sessionId: string;
    userProfile?: Record<string, unknown>;
  };
  const { messages, sessionId, userProfile = {} } = body;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let fullResponse = "";
      const send = (data: unknown) =>
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
        );

      try {
        await streamChatResponse(
          messages,
          (chunk) => send({ chunk }),
          async (complete) => {
            fullResponse = complete;

            // 1. Lead submission (EverQuote) — preferred path for insurance
            const submitMatch = complete.match(
              /<submit_lead>([\s\S]*?)<\/submit_lead>/,
            );
            let everquoteFailed = false;
            let submittedProfile: Record<string, unknown> | null = null;
            if (submitMatch) {
              try {
                const profileBody = JSON.parse(submitMatch[1]) as Omit<
                  AltoUserProfile,
                  "session_id"
                >;
                submittedProfile = profileBody as unknown as Record<
                  string,
                  unknown
                >;
                const profile: AltoUserProfile = {
                  ...profileBody,
                  session_id: sessionId,
                };
                if (!isEverQuoteConfigured()) {
                  everquoteFailed = true;
                  send({
                    type: "lead_error",
                    error:
                      "EverQuote isn't configured yet — falling back to direct quotes.",
                  });
                } else {
                  const { response, earnedCents } =
                    await submitLeadToEverQuote(profile);

                  // Best-effort persist
                  try {
                    const supabase = createServerClient();
                    if (supabase) {
                      await supabase.from("leads").insert({
                        conversation_id: sessionId,
                        provider: "everquote",
                        vertical: profile.insurance_type,
                        everquote_uuid: response.uuid,
                        status: response.accept ? "accepted" : "rejected",
                        bid_cents: response.bid_cents,
                        duration_seconds: response.duration_seconds,
                        referral_fee: earnedCents / 100,
                      });
                    }
                  } catch {
                    /* non-fatal */
                  }

                  if (response.accept) {
                    send({
                      type: "lead_accepted",
                      uuid: response.uuid,
                      callNumber: process.env.EVERQUOTE_CALL_NUMBER ?? null,
                      durationSeconds: response.duration_seconds,
                      earnedDollars: (earnedCents / 100).toFixed(2),
                      vertical: profile.insurance_type,
                    });
                  } else {
                    everquoteFailed = true;
                    send({
                      type: "lead_rejected",
                      reason:
                        response.reason ||
                        "EverQuote did not accept this lead",
                    });
                  }
                }
              } catch (e) {
                everquoteFailed = true;
                console.error("[chat] EverQuote submission failed:", e);
                send({
                  type: "lead_error",
                  error: e instanceof Error ? e.message : "Submission failed",
                });
              }
            }

            // 1.5 Plaid connect (mortgage flow)
            if (/<plaid_connect\s*\/?>/i.test(complete)) {
              send({ type: "plaid_connect" });
            }

            // 1.75 Mortgage recommendations — fan out to lender deep links
            const mortgageMatch = complete.match(
              /<recommend_mortgage>([\s\S]*?)<\/recommend_mortgage>/,
            );
            if (mortgageMatch) {
              try {
                const profile = JSON.parse(
                  mortgageMatch[1],
                ) as MortgageProfile;
                const offers = buildMortgageOffers(profile);
                send({
                  type: "mortgage_offers",
                  profile,
                  offers,
                });
              } catch (e) {
                console.error("[chat] mortgage parse failed:", e);
                send({
                  type: "error",
                  error: "Couldn't generate mortgage offers.",
                });
              }
            }

            // 2. Quote fetch (mock fallback / life insurance)
            const fetchMatch = complete.match(
              /<fetch_quotes>([\s\S]*?)<\/fetch_quotes>/,
            );
            if (fetchMatch || everquoteFailed) {
              try {
                let params: FetchQuotesParams;
                if (fetchMatch) {
                  params = JSON.parse(fetchMatch[1]) as FetchQuotesParams;
                } else {
                  // EverQuote-rejected fallback — reuse the profile we
                  // already collected during the submit_lead flow so the
                  // mock quotes still get real prices/coverage/state.
                  const sp = (submittedProfile ?? {}) as Record<
                    string,
                    unknown
                  >;
                  params = {
                    vertical: "insurance",
                    type: (sp.insurance_type as FetchQuotesParams["type"]) ?? "home",
                    zip_code: (sp.zip_code as string) ?? "00000",
                    profile: sp,
                  };
                }
                const quotes = await fetchInsuranceQuotes(params);
                send({ type: "quotes", quotes });
              } catch (e) {
                console.error("[chat] quote fetch failed:", e);
                send({ type: "error", error: "Quote fetch failed." });
              }
            }

            try {
              await saveConversation(sessionId, messages, fullResponse, userProfile);
            } catch (e) {
              console.error("[chat] save conversation failed:", e);
            }

            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          },
        );
      } catch (e) {
        console.error("[chat] stream error:", e);
        send({
          type: "error",
          error: e instanceof Error ? e.message : "Stream error",
        });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
