import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Public URL of this deployment — used for canonical + Open Graph tags. */
const LIVE_URL = "https://256f85e04e8b0383d9bcc22d136376db.ctonew.app";

const SITE_DESCRIPTION =
  "A clean, searchable public changelog for your product — category tags, month-by-month history and live search at one link. Free to start, and no account required for your customers.";

function resolveSiteUrl(): URL {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  // Ignore loopback values: an OG tag pointing at localhost shares badly.
  if (fromEnv && !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(fromEnv)) {
    try {
      return new URL(fromEnv);
    } catch {
      // fall through to the known public URL
    }
  }
  return new URL(LIVE_URL);
}

export const metadata: Metadata = {
  metadataBase: resolveSiteUrl(),
  title: {
    default: "ChangelogSync — public changelogs your customers will read",
    template: "%s — ChangelogSync",
  },
  description: SITE_DESCRIPTION,
  applicationName: "ChangelogSync",
  keywords: [
    "changelog",
    "product updates",
    "release notes",
    "public changelog",
    "what's new",
    "ChangelogSync",
  ],
  openGraph: {
    type: "website",
    siteName: "ChangelogSync",
    title: "ChangelogSync — public changelogs your customers will read",
    description: SITE_DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "ChangelogSync — public changelogs your customers will read",
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
