import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Startup Search · UK company formations",
  description:
    "Track newly registered UK companies in real time. Industries, regions, signals — straight from Companies House.",
  metadataBase: new URL("https://startupsearch.co.uk"),
  openGraph: {
    title: "Startup Search · UK company formations",
    description:
      "Filter 5 million UK companies by sector, region, postcode, and dozens of other dimensions — straight from Companies House.",
    url: "https://startupsearch.co.uk",
    siteName: "Startup Search",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0c0e" },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  )
}
