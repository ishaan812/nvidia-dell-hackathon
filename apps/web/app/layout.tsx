import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from "next/font/google";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const plex = IBM_Plex_Sans({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const news = Newsreader({
  variable: "--font-news",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  applicationName: BRAND.name,
  title: {
    default: BRAND.name,
    template: `%s · ${BRAND.name}`,
  },
  description: BRAND.description,
  appleWebApp: {
    title: BRAND.name,
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: BRAND.name,
    description: BRAND.description,
    siteName: BRAND.name,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND.name,
    description: BRAND.description,
  },
};

export const viewport: Viewport = {
  themeColor: BRAND.desk,
  colorScheme: "dark light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${plex.variable} ${news.variable} ${mono.variable} h-full`} data-theme="dark">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("nd-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;else if(window.matchMedia("(prefers-color-scheme: light)").matches)document.documentElement.dataset.theme="light"}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full bg-desk text-paper">{children}</body>
    </html>
  );
}
