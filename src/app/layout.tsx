import type { Metadata } from "next";
import { Poppins, Potta_One } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const potta = Potta_One({
  variable: "--font-potta",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "BravoBall Coach",
  description: "Coach MVP dashboard for BravoBall",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} ${potta.variable}`}>
      <body>{children}</body>
    </html>
  );
}
