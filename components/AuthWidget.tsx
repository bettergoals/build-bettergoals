"use client";

import { useEffect, useState } from "react";

type Me = { enabled: boolean; signedIn: boolean; name: string | null };

export default function AuthWidget() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  if (!me?.enabled) return null;

  if (!me.signedIn) {
    return (
      <a href="/login" className="rounded-full border border-ink/15 px-3 py-1.5 hover:bg-ink/5">
        Sign in
      </a>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <span className="rounded-full bg-sooner/15 px-3 py-1.5 font-semibold text-sooner">{me.name}</span>
      <button
        onClick={async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          window.location.reload();
        }}
        className="rounded-full px-2 py-1.5 text-ink-soft hover:bg-ink/5"
        title="Sign out"
      >
        ↩
      </button>
    </span>
  );
}
