import { Suspense } from "react";
import { BillingSuccessInner } from "./Inner";

export const metadata = {
  title: "Welcome to Alto Pro",
};

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={null}>
      <BillingSuccessInner />
    </Suspense>
  );
}
