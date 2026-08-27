import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";

import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Found Calc",
    template: "%s · Found Calc",
  },
  description: "Decision calculators with transparent assumptions and traceable rules.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={spaceGrotesk.variable}>
      <body>{children}</body>
    </html>
  );
}
