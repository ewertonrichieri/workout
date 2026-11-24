import type { Metadata, Viewport } from "next";
import { APP_THEME_COLOR } from "@/lib/constants/app";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Workout",
  description: "Personal trainer com IA",
  appleWebApp: { capable: true, title: "Workout", statusBarStyle: "black-translucent" },
};

/** Browser UI color of the installed app (step 3.8). */
export const viewport: Viewport = { themeColor: APP_THEME_COLOR };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
