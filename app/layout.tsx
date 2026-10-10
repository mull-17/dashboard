import "./globals.css";
import { Plus_Jakarta_Sans } from "next/font/google";

const font = Plus_Jakarta_Sans({ subsets: ["latin"], display: "swap" });

export const metadata = {
  title: "Dashboard Admin",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body
        className={`${font.className} bg-slate-100 text-slate-900 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}