import { NextRequest, NextResponse } from "next/server";
import { streamChatResponse } from "@/lib/claude";
import { fetchInsuranceQuotes, buildHomeWarnings } from "@/lib/insurance";
import {
  submitLeadToEverQuote,
  isEverQuoteConfigured,
  type AltoUserProfile,
} from "@/lib/everquote";
// Note: server-side persistence was removed when we moved to Firestore.
// Coverage saves now happen client-side from ChatInterface. EverQuote
// stores its own copy of the lead (uuid is returned to the client).
import {
  buildMortgageOffers,
  type MortgageProfile,
} from "@/lib/mortgage";
import { searchListings, type ListingSearchParams } from "@/lib/realestate";
import type { ChatMessage, FetchQuotesParams } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    messages: ChatMessage[];
    sessionId: string;
    userProfile?: Record<string, unknown>;
    tier?: "free" | "pro" | "business";
  };
  const { messages, sessionId, userProfile = {}, tier = "free" } = body;
  const isFreeTier = tier === "free";

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

                  // Lead is stored on EverQuote's side via response.uuid;
                  // no server-side DB write here. earnedCents is bound
                  // to the local closure so we can return it to the
                  // client for analytics if/when needed.
                  void earnedCents;

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

            // 1.5 Plaid connect (mortgage flow) — Pro only
            if (/<plaid_connect\s*\/?>/i.test(complete)) {
              if (isFreeTier) {
                send({ type: "paywall", feature: "plaid" });
              } else {
                send({ type: "plaid_connect" });
              }
            }

            // 1.75 Mortgage recommendations — fan out to lender deep links
            // Pro/Business only.
            const mortgageMatch = complete.match(
              /<recommend_mortgage>([\s\S]*?)<\/recommend_mortgage>/,
            );
            if (mortgageMatch && isFreeTier) {
              send({ type: "paywall", feature: "mortgage" });
            }
            if (mortgageMatch && !isFreeTier) {
              try {
                const profile = JSON.parse(
                  mortgageMatch[1],
                ) as MortgageProfile;
                const {
                  offers,
                  baseRate30,
                  baseRate15,
                  baseRateSource,
                  baseRateAsOf,
                } = await buildMortgageOffers(profile);
                send({
                  type: "mortgage_offers",
                  profile,
                  offers,
                  baseRate30,
                  baseRate15,
                  baseRateSource,
                  baseRateAsOf,
                });
              } catch (e) {
                console.error("[chat] mortgage parse failed:", e);
                send({
                  type: "error",
                  error: "Couldn't generate mortgage offers.",
                });
              }
            }

            // 1.9 Real estate listings — Rentcast + fallback. Pro only.
            const listingsMatch = complete.match(
              /<fetch_listings>([\s\S]*?)<\/fetch_listings>/,
            );
            if (listingsMatch && isFreeTier) {
              send({ type: "paywall", feature: "real_estate" });
            }
            if (listingsMatch && !isFreeTier) {
              try {
                const params = JSON.parse(
                  listingsMatch[1],
                ) as ListingSearchParams;
                const result = await searchListings(params);
                send({
                  type: "listings",
                  listings: result.listings,
                  source: result.source,
                  fallbackUrls: result.fallbackUrls,
                });
              } catch (e) {
                console.error("[chat] listing fetch failed:", e);
                send({
                  type: "error",
                  error: "Listing search failed.",
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
                  params.sessionId = sessionId;
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
                    sessionId,
                  };
                }
                const quotes = await fetchInsuranceQuotes(params);
                const warnings =
                  params.type === "home"
                    ? buildHomeWarnings(
                        (params.profile ?? {}) as Parameters<
                          typeof buildHomeWarnings
                        >[0],
                      )
                    : [];
                send({ type: "quotes", quotes, warnings });
              } catch (e) {
                console.error("[chat] quote fetch failed:", e);
                send({ type: "error", error: "Quote fetch failed." });
              }
            }

            // Conversation persistence is now client-side (Firestore via
            // ChatInterface when the user is signed in). The server holds
            // no DB.
            void userProfile;
            void fullResponse;

            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          },
          { tier },
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
