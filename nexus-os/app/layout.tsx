import type { Metadata } from "next";
import "./globals.css";
import StoreHydration from "@/components/StoreHydration";

export const metadata: Metadata = {
  title: "NEXUS::OS — KANBAN APP",
  description: "Project dashboard and task matrix",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <StoreHydration />
        {children}
      </body>
    </html>
  );
}
