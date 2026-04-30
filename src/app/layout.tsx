import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Noto_Serif } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import ThemeProvider from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import CookieBanner from "@/components/cookie-banner";
import PageBackground from "@/components/page-background";

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const notoSerif = Noto_Serif({
  subsets: ['latin'],
  variable: '--font-heading',
  weight: ['400', '500', '600', '700'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600'],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://scribverse.xyz';

const siteTitle = 'scribverse';
const siteDescription =
  'Paste a supported video link, then copy or download everything as structured Markdown.';

export const metadata: Metadata = {
  title: siteTitle,
  description: siteDescription,
  metadataBase: new URL(siteUrl),
  icons: {
    icon: [{ url: '/scribverse_favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/scribverse_favicon.svg',
    apple: '/scribverse_favicon.svg',
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    type: "website",
    url: siteUrl,
    images: [
      {
        url: "/og_image.jpg",
        width: 1200,
        height: 630,
        alt: "scribverse — paste a video link, get Markdown",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/og_image.jpg"],
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
      className={`${inter.variable} ${notoSerif.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-[100dvh] bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange={false}>
          <div className="relative isolate min-h-[100dvh]">
            <PageBackground />
            <div className="relative z-10 flex min-h-[100dvh] flex-col">
              <Header />
              <main className="flex min-h-0 flex-1 flex-col pt-16">{children}</main>
              <Footer />
            </div>
          </div>
          <CookieBanner />
          <Toaster position="bottom-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
