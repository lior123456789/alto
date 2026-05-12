"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Sparkles as SparklesComp } from "@/components/ui/sparkles";
import { TimelineContent } from "@/components/ui/timeline-animation";
import { VerticalCutReveal } from "@/components/ui/vertical-cut-reveal";
import { cn } from "@/lib/utils";
import NumberFlow from "@number-flow/react";
import { motion } from "framer-motion";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getFirebaseAuth,
  signInWithGoogle,
  onAuthStateChanged,
} from "@/lib/firebase";
import {
  setUserTier,
  useSubscription,
  type SubscriptionTier,
} from "@/lib/subscription";

interface Plan {
  id: "free" | "pro" | "business";
  name: string;
  description: string;
  price: number;
  yearlyPrice: number;
  buttonText: string;
  buttonVariant: "default" | "outline";
  popular?: boolean;
  includes: string[];
}

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    description:
      "Try Alto for a single insurance quote. Limited usage, no commitment.",
    price: 0,
    yearlyPrice: 0,
    buttonText: "Start free",
    buttonVariant: "outline",
    includes: [
      "Free includes:",
      "5 conversations per month",
      "Insurance quotes only (home · auto · renters)",
      "1 saved coverage item",
      "Standard provider list",
      "No bank-linking, no mortgage, no real estate",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description:
      "Everything Alto can do — insurance, mortgage, real estate, scenario modeling, saved history.",
    price: 12,
    yearlyPrice: 99,
    buttonText: "Upgrade to Pro",
    buttonVariant: "default",
    popular: true,
    includes: [
      "Everything in Free, plus:",
      "Unlimited conversations",
      "Mortgage rate shopping + Plaid bank-link",
      "Real estate listing search (Rentcast + national MLS)",
      "Unlimited coverage dashboard",
      "Scenario comparison (refi vs. hold, rent vs. buy)",
      "Personalized rate alerts + saved history",
      "Export reports (PDF + CSV)",
    ],
  },
  {
    id: "business",
    name: "Business",
    description:
      "For brokerages and teams that want Alto white-labeled to their clients.",
    price: 99,
    yearlyPrice: 899,
    buttonText: "Talk to sales",
    buttonVariant: "outline",
    includes: [
      "Everything in Pro, plus:",
      "White-label branding",
      "Up to 10 team members",
      "API access + Zapier integration",
      "Dedicated success manager",
      "Custom partner integrations",
    ],
  },
];

const PricingSwitch = ({
  onSwitch,
}: {
  onSwitch: (value: string) => void;
}) => {
  const [selected, setSelected] = useState("0");
  const handleSwitch = (value: string) => {
    setSelected(value);
    onSwitch(value);
  };
  return (
    <div className="flex justify-center">
      <div className="relative z-10 mx-auto flex w-fit rounded-full bg-slate-900/60 border border-white/10 p-1">
        <button
          onClick={() => handleSwitch("0")}
          className={cn(
            "relative z-10 w-fit h-10 rounded-full sm:px-6 px-3 sm:py-2 py-1 font-medium transition-colors text-sm",
            selected === "0" ? "text-white" : "text-white/60",
          )}
        >
          {selected === "0" && (
            <motion.span
              layoutId="switch"
              className="absolute top-0 left-0 h-10 w-full rounded-full border-4 shadow-sm shadow-sky-600 border-sky-500 bg-gradient-to-t from-sky-500 to-sky-400"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          <span className="relative">Monthly</span>
        </button>
        <button
          onClick={() => handleSwitch("1")}
          className={cn(
            "relative z-10 w-fit h-10 flex-shrink-0 rounded-full sm:px-6 px-3 sm:py-2 py-1 font-medium transition-colors text-sm",
            selected === "1" ? "text-white" : "text-white/60",
          )}
        >
          {selected === "1" && (
            <motion.span
              layoutId="switch"
              className="absolute top-0 left-0 h-10 w-full rounded-full border-4 shadow-sm shadow-sky-600 border-sky-500 bg-gradient-to-t from-sky-500 to-sky-400"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          <span className="relative flex items-center gap-2">
            Yearly
            <span className="text-[10px] bg-emerald-400/20 text-emerald-300 px-1.5 py-0.5 rounded-full">
              Save 30%
            </span>
          </span>
        </button>
      </div>
    </div>
  );
};

export default function AltoPricingSection() {
  const [isYearly, setIsYearly] = useState(false);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const pricingRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { tier: currentTier, uid } = useSubscription();

  const ensureSignedIn = async (): Promise<string | null> => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setErrMsg("Auth isn't configured");
      return null;
    }
    if (auth.currentUser) return auth.currentUser.uid;
    try {
      const cred = await signInWithGoogle();
      return cred.user.uid;
    } catch {
      // Wait for popup to resolve via auth state in case of race
      return new Promise<string | null>((resolve) => {
        const off = onAuthStateChanged(auth, (u) => {
          off();
          resolve(u?.uid ?? null);
        });
        setTimeout(() => resolve(null), 5000);
      });
    }
  };

  const handleUpgrade = async (plan: Plan) => {
    setErrMsg(null);
    if (plan.id === "free") {
      router.push("/chat");
      return;
    }
    if (plan.id === "business") {
      window.location.href =
        "mailto:paul@nemapp.com?subject=Alto%20Business%20-%20demo%20request";
      return;
    }
    setBusyPlan(plan.id);
    try {
      const signedInUid = uid ?? (await ensureSignedIn());
      const email = getFirebaseAuth()?.currentUser?.email ?? null;
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: plan.id,
          period: isYearly ? "yearly" : "monthly",
          uid: signedInUid,
          email,
        }),
      });
      const data = (await res.json()) as {
        mode?: "stripe" | "dev_flip";
        url?: string;
        tier?: SubscriptionTier;
        reason?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");

      if (data.mode === "stripe" && data.url) {
        window.location.href = data.url;
        return;
      }
      // Dev fallback — no Stripe price IDs configured. Flip the tier
      // directly so the upgrade button still produces a visible effect
      // for local dev / pre-launch testing.
      if (data.mode === "dev_flip" && data.tier) {
        if (!signedInUid) {
          setErrMsg("Sign in to upgrade");
          return;
        }
        await setUserTier(signedInUid, data.tier);
        router.push("/billing/success?dev=1");
        return;
      }
      setErrMsg("Couldn't start checkout");
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setBusyPlan(null);
    }
  };

  const revealVariants = {
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: { delay: i * 0.4, duration: 0.5 },
    }),
    hidden: { filter: "blur(10px)", y: -20, opacity: 0 },
  };

  const togglePricingPeriod = (value: string) =>
    setIsYearly(Number.parseInt(value) === 1);

  return (
    <div
      className="mx-auto relative bg-[#050507] overflow-x-hidden py-32"
      ref={pricingRef}
    >
      <TimelineContent
        animationNum={4}
        timelineRef={pricingRef}
        customVariants={revealVariants}
        className="absolute top-0 h-96 w-screen overflow-hidden [mask-image:radial-gradient(50%_50%,white,transparent)]"
      >
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#ffffff2c_1px,transparent_1px),linear-gradient(to_bottom,#3a3a3a01_1px,transparent_1px)] bg-[size:70px_80px]" />
        <SparklesComp
          density={1800}
          speed={1}
          color="#FFFFFF"
          className="absolute inset-x-0 bottom-0 h-full w-full [mask-image:radial-gradient(50%_50%,white,transparent_85%)]"
        />
      </TimelineContent>

      <TimelineContent
        animationNum={5}
        timelineRef={pricingRef}
        customVariants={revealVariants}
        className="absolute left-0 top-[-114px] w-full h-[113.625vh] flex flex-col items-start justify-start content-start flex-none flex-nowrap gap-2.5 overflow-hidden p-0 z-0"
      >
        <div className="relative w-full h-full">
          <div
            className="absolute left-[-568px] right-[-568px] top-0 h-[2053px] flex-none rounded-full"
            style={{
              border: "200px solid #0ea5e9",
              filter: "blur(92px)",
              WebkitFilter: "blur(92px)",
            }}
          />
          <div
            className="absolute left-[-568px] right-[-568px] top-0 h-[2053px] flex-none rounded-full"
            style={{
              border: "200px solid #0ea5e9",
              filter: "blur(92px)",
              WebkitFilter: "blur(92px)",
            }}
          />
        </div>
      </TimelineContent>

      <article className="text-center mb-6 max-w-3xl mx-auto space-y-2 relative z-50 px-6">
        <h2 className="text-4xl font-medium text-white">
          <VerticalCutReveal
            splitBy="words"
            staggerDuration={0.15}
            staggerFrom="first"
            reverse={true}
            containerClassName="justify-center"
            transition={{
              type: "spring",
              stiffness: 250,
              damping: 40,
              delay: 0,
            }}
          >
            Use Alto free, forever.
          </VerticalCutReveal>
        </h2>

        <TimelineContent
          as="p"
          animationNum={0}
          timelineRef={pricingRef}
          customVariants={revealVariants}
          className="text-gray-300"
        >
          Or upgrade for saved conversations, scenario modeling, and
          white-label brokerage tools.
        </TimelineContent>

        <TimelineContent
          as="div"
          animationNum={1}
          timelineRef={pricingRef}
          customVariants={revealVariants}
        >
          <PricingSwitch onSwitch={togglePricingPeriod} />
        </TimelineContent>
      </article>

      <div
        className="absolute top-0 left-[10%] right-[10%] w-[80%] h-full z-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at center, rgba(14,165,233,0.35) 0%, transparent 70%)",
          mixBlendMode: "screen",
        }}
      />

      <div className="grid md:grid-cols-3 max-w-5xl gap-4 py-6 mx-auto px-6 relative z-10">
        {plans.map((plan, index) => (
          <TimelineContent
            key={plan.name}
            as="div"
            animationNum={2 + index}
            timelineRef={pricingRef}
            customVariants={revealVariants}
          >
            <Card
              className={cn(
                "relative text-white border-white/[0.06] h-full",
                plan.popular
                  ? "bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 shadow-[0px_-13px_300px_0px_#0ea5e9] z-20"
                  : "bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 z-10",
              )}
            >
              <CardHeader className="text-left">
                <div className="flex justify-between">
                  <h3 className="text-3xl mb-2">{plan.name}</h3>
                </div>
                <div className="flex items-baseline">
                  <span className="text-4xl font-semibold">
                    $
                    <NumberFlow
                      format={{ currency: "USD" }}
                      value={isYearly ? plan.yearlyPrice : plan.price}
                      className="text-4xl font-semibold"
                    />
                  </span>
                  <span className="text-gray-300 ml-1">
                    /{isYearly ? "year" : "month"}
                  </span>
                </div>
                <p className="text-sm text-gray-300 mb-4">{plan.description}</p>
              </CardHeader>

              <CardContent className="pt-0">
                <button
                  onClick={() => handleUpgrade(plan)}
                  disabled={busyPlan === plan.id || currentTier === plan.id}
                  className={cn(
                    "w-full mb-6 p-4 text-base rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
                    plan.popular
                      ? "bg-gradient-to-t from-sky-500 to-sky-400 shadow-lg shadow-sky-800 border border-sky-500 text-white hover:from-sky-400 hover:to-sky-300"
                      : "bg-gradient-to-t from-slate-950 to-slate-800 shadow-lg shadow-slate-950 border border-white/10 text-white hover:from-neutral-900 hover:to-neutral-600",
                  )}
                >
                  {busyPlan === plan.id
                    ? "Loading…"
                    : currentTier === plan.id && plan.id !== "free"
                      ? "Your current plan"
                      : plan.buttonText}
                </button>

                <div className="space-y-3 pt-4 border-t border-white/[0.06]">
                  <h4 className="font-medium text-base mb-3">
                    {plan.includes[0]}
                  </h4>
                  <ul className="space-y-2">
                    {plan.includes.slice(1).map((feature, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 bg-sky-400/80 rounded-full grid place-content-center" />
                        <span className="text-sm text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TimelineContent>
        ))}
      </div>
      {errMsg && (
        <p className="relative z-10 mx-auto max-w-md text-center text-sm text-rose-300 mt-4 px-4">
          {errMsg}
        </p>
      )}
    </div>
  );
}
