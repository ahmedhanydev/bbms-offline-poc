import type { Metadata } from "next";
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
  title: "BBMS",
  description: "Blood Bank Management System",
  manifest: "/manifest.json",
  metadataBase: new URL("https://bbms-offline-poc.vercel.app"),
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BBMS",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#ff0000" />
        <meta name="apple-mobile-web-app-title" content="BBMS" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />

        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/web-app-manifest-192x192.png" />
        <link
          rel="apple-touch-icon"
          sizes="192x192"
          href="/web-app-manifest-192x192.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="512x512"
          href="/web-app-manifest-512x512.png"
        />

        {/* Apple Startup Images - iPhone 14 Pro Max */}
        <link
          rel="apple-touch-startup-image"
          href="/splash-screens/splash-1242x2688.png"
          media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)"
        />

        {/* Apple Startup Images - iPhone 14 Pro */}
        <link
          rel="apple-touch-startup-image"
          href="/splash-screens/splash-1170x2532.png"
          media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)"
        />

        {/* Apple Startup Images - iPhone 14 */}
        <link
          rel="apple-touch-startup-image"
          href="/splash-screens/splash-1125x2436.png"
          media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)"
        />

        {/* Apple Startup Images - iPhone SE */}
        <link
          rel="apple-touch-startup-image"
          href="/splash-screens/splash-750x1334.png"
          media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)"
        />

        {/* Apple Startup Images - iPad Pro */}
        <link
          rel="apple-touch-startup-image"
          href="/splash-screens/splash-2048x2732.png"
          media="(device-width: 1024px) and (device-height: 1366px)"
        />

        {/* Fallback */}
        <link
          rel="apple-touch-startup-image"
          href="/web-app-manifest-512x512.png"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
