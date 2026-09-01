import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PREVIEW_URL, PRODUCT_URL, REPO_URL, SITE } from "@/lib/config";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: SITE.name, template: `%s · ${SITE.name}` },
  description: SITE.description,
};

const NAV = [
  { href: PRODUCT_URL, label: "Product ↗" },
  { href: PREVIEW_URL, label: "Preview ↗" },
  { href: REPO_URL, label: "GitHub ↗" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col font-sans antialiased`}>
        <header className="sticky top-0 z-20 border-b border-ink/10 bg-chalk/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
            <a href="/" className="text-lg font-bold tracking-tight">
              better<span className="text-sooner">goals</span>{" "}
              <span className="rounded-full bg-happier/15 px-2 py-0.5 text-xs font-bold text-happier align-middle">
                🛠️ builder
              </span>
            </a>
            <nav className="flex items-center gap-1 text-sm font-medium sm:gap-2">
              {NAV.map((item) => (
                <a key={item.href} href={item.href} target="_blank" rel="noreferrer" className="rounded-full px-3 py-1.5 hover:bg-ink/5">
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="mt-16 border-t border-ink/10 bg-ink text-chalk">
          <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-8 text-center text-sm sm:flex-row sm:justify-between sm:text-left">
            <p className="opacity-80">
              The build experience for{" "}
              <a href={PRODUCT_URL} className="underline underline-offset-2">bettergoals.ai</a> — ideas in, product out.
            </p>
            <p className="opacity-80">
              Supported by{" "}
              <a href="https://teamform.co" target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-2">TeamForm</a>{" "}
              and{" "}
              <a href="https://soonersaferhappier.com" target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-2">Sooner Safer Happier</a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
