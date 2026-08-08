import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { CommandPalette } from "@/components/command/CommandPalette";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Argus — Lie Detector for Ethereum RPCs",
  description:
    "Argus continuously cross-examines Ethereum RPC providers, detects censorship and stale data, and publishes cryptographically verifiable evidence. Built for the Censorship Resistance track at Road to Devcon 2026.",
  openGraph: {
    title: "Argus — Lie Detector for Ethereum RPCs",
    description:
      "Server-side RPC monitor with isomorphic consensus math and on-chain attestation.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-carbon text-bone antialiased">
        {children}
        <CommandPalette />
      </body>
    </html>
  );
}
