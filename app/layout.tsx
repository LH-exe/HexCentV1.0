import type { Metadata } from "next";
import { JetBrains_Mono, Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const firaCode = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "HexCent — Personal Projects & Engineering Hub",
  description:
    "HexCent is a personal engineering hub hosting project showcases, workspace, and system controls.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${firaCode.variable} antialiased min-h-screen bg-dark-900 font-mono flex flex-col`}
      >
        <Navbar />
        <main className="mx-auto max-w-[1400px] w-full px-4 sm:px-6 py-6 flex-1 page-fade-in">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
