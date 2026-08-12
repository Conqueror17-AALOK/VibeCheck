import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VibeCheck",
  description: "Upload a design, check what actually shipped.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
