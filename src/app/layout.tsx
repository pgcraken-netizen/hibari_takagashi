import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "高橋先生とあそぼう！ ― 今日は先生、なに着てる？",
  description: "帽子を選んで、季節を感じて、先生とちょっと遊ぼう。うりずんの高橋先生と遊べる、やさしい着せ替えコレクションゲーム。",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "高橋先生とあそぼう", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fff8ea",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Kiwi+Maru:wght@500&family=Zen+Maru+Gothic:wght@500;700;900&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
