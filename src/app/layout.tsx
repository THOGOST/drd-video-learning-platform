import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";

export const metadata: Metadata = {
  title: "منصة درس | DRD — التعلم بالفيديو وتتبع تقدمك",
  description:
    "منصة تعليمية لمشاهدة فيديوهات الشرح وتتبع تقدم المستخدم: كورسات، دروس بالفيديو، حفظ تلقائي للتقدم، واستكمال المشاهدة من آخر نقطة توقف.",
  keywords: ["تعليم", "كورسات", "فيديو", "منصة تعليمية", "دروس", "DRD"],
  openGraph: {
    title: "منصة درس | التعلم بالفيديو",
    description: "كورسات ودروس بالفيديو مع تتبع تلقائي للتقدم",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-background text-foreground min-h-screen">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
