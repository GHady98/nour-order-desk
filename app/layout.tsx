import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Nour’s Order Desk",
  description:
    "A focused, temporary order desk for a fictional candle studio. TechTalks Assignment 4 by Ghady Nazha.",
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
