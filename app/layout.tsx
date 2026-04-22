import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Padel39 Events",
  description: "Tournament management for Padel39",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
