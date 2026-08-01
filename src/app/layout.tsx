import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FixFlow Service — ремонт техники, сантехника и кондиционеры",
  description:
    "Вызов мастера в Москве: ремонт бытовой техники, сантехнические работы и обслуживание кондиционеров. Запись на выезд онлайн.",
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
