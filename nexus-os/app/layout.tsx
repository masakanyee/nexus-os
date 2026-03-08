import type { Metadata } from "next";
import "./globals.css";

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
      <body style={{ margin: 0, minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  );
}
