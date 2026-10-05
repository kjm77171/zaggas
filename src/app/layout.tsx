import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./visualGrammar.css";

export const metadata: Metadata = {
  title: "ZAGGAS",
  description: "Be real. Be human. Simple outside. Deep inside.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
