"use client";

import { useState } from "react";

type Step = "email" | "verify" | "done";

export default function LoginFlow() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const post = async (url: string, body: object) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? "Something went wrong — try again.");
    }
    return res.json();
  };

  const requestPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await post("/api/auth/request", { email });
      setStep("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await post("/api/auth/verify", { pin, name });
      setStep("done");
      setTimeout(() => window.location.assign("/"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const inputCls = "w-full rounded-full border border-ink/15 bg-white px-4 py-2.5 text-sm";
  const buttonCls =
    "w-full rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-chalk hover:bg-ink-soft disabled:opacity-50";

  if (step === "done") {
    return (
      <p className="rounded-2xl bg-sooner/10 p-6 text-center font-semibold text-sooner">
        You&apos;re in, {name}! Taking you to the board…
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
      {step === "email" ? (
        <form onSubmit={requestPin} className="flex flex-col gap-3">
          <label className="text-sm font-semibold" htmlFor="email">
            Your email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputCls}
            autoComplete="email"
          />
          <button type="submit" disabled={busy || !email} className={buttonCls}>
            {busy ? "Sending…" : "Email me a code"}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="flex flex-col gap-3">
          <p className="text-sm text-ink-soft">
            We sent a 6-digit code to <strong>{email}</strong>. It expires in 10 minutes.
          </p>
          <label className="text-sm font-semibold" htmlFor="pin">
            Code
          </label>
          <input
            id="pin"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            required
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            className={`${inputCls} font-mono tracking-[0.4em]`}
            autoComplete="one-time-code"
          />
          <label className="text-sm font-semibold" htmlFor="name">
            Display name <span className="font-normal text-ink-soft">(shown on your contributions)</span>
          </label>
          <input
            id="name"
            type="text"
            required
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane C."
            className={inputCls}
          />
          <button type="submit" disabled={busy || pin.length !== 6 || !name.trim()} className={buttonCls}>
            {busy ? "Checking…" : "Sign in"}
          </button>
          <button type="button" onClick={() => setStep("email")} className="text-sm text-ink-soft underline underline-offset-2">
            Use a different email
          </button>
        </form>
      )}
      {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}
