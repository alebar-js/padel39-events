import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Padel39 Events",
  description: "Tournament management for Padel39",
  icons: {
    icon: [
      { url: "/padel39.png", sizes: "39x39", type: "image/png" },
      { url: "/padel39.png", sizes: "any", type: "image/png" }
    ],
    shortcut: "/padel39.png",
    apple: [
      { url: "/padel39.png", sizes: "39x39", type: "image/png" }
    ],
  },
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
