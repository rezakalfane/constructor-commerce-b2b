"use client";

import { useFormStatus } from "react-dom";

/** The demo checkout's submit button: disabled with a "placing" label while the server action runs. */
export function PlaceOrderButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary w-full py-3.5">
      {pending ? pendingLabel : label}
    </button>
  );
}
