import LoginFlow from "@/components/LoginFlow";
import { authEnabled } from "@/lib/auth";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Sign in with email</h1>
      <p className="mt-2 text-ink-soft">
        No GitHub account needed — just your email and a 6-digit code. Signing in
        lets the community attribute your contributions; in-app voting and idea
        submission for email users are on the{" "}
        <a
          href="https://github.com/bettergoals/bettergoals/issues/7"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          roadmap
        </a>
        .
      </p>
      <div className="mt-8">
        {authEnabled() ? (
          <LoginFlow />
        ) : (
          <p className="rounded-2xl border border-happier/40 bg-happier/10 p-6 text-sm">
            ✉️ Email sign-in is <strong>almost ready</strong> — it switches on once email
            sending is configured. For now, contribute with a free{" "}
            <a href="https://github.com/signup" className="font-semibold underline underline-offset-2">
              GitHub account
            </a>
            .
          </p>
        )}
      </div>
    </div>
  );
}
