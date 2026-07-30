import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FixFlow AI — AI-диспетчер сервисной компании",
  description:
    "Публичное портфолио-демо AI-диспетчера и CRM для выездного сервиса.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full">
      <body className="flex min-h-full flex-col antialiased">{children}</body>
    </html>
  );
}
