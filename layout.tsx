import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Statistics from "./components/Statistics";
import { Toaster } from "sonner";
import Plausible from "./components/Plausible";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_TITLE,
  description: process.env.NEXT_PUBLIC_DESCRIPTION,
  keywords: process.env.NEXT_PUBLIC_KEYWORDS,
  viewport: "width=device-width, initial-scale=1",
  openGraph: {
    title: process.env.NEXT_PUBLIC_TITLE,
    description: process.env.NEXT_PUBLIC_DESCRIPTION,
    type: "website",
    siteName: process.env.NEXT_PUBLIC_TITLE,
    locale: "en_US",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.className} ${geistMono.variable} antialiased bg-[rgb(3,3,4)] text-[rgb(220,220,220)]`}
      >
        <Statistics />
        {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && <Plausible />}
        <main role="main">{children}</main>
        <Toaster
          theme="dark"
          toastOptions={{
            classNames: {
              description: "text-xs text-red-500 dark:text-gray-400",
            },
          }}
        />
      </body>
    </html>
  );
}
