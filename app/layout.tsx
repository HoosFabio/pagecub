import type { Metadata } from "next";
import "./globals.css";
import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "PageCub - Personalized illustrated storybooks",
  description: "A custom illustrated adventure made around your child.",
  metadataBase: new URL("https://pagecub.com")
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        {children}
        <Footer />
      </body>
    </html>
  );
}
