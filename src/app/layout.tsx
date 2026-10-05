import type { Metadata, Viewport } from "next";
import "@fontsource/yusei-magic/index.css";
import "@fontsource/zen-maru-gothic/500.css";
import "@fontsource/zen-maru-gothic/700.css";
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
      <body>{children}</body>
    </html>
  );
}
