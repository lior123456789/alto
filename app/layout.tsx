import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Alto — Skip the broker. Get the best deal.",
  description:
    "Alto is the AI that replaces brokers. Insurance, mortgage, real estate — one conversation, every provider, no commissions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#050507] text-white">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
