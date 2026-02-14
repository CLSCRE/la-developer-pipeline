import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "../components/AuthProvider";
import AppShell from "../components/AppShell";

export const metadata: Metadata = {
  title: "LA Developer Pipeline",
  description: "CLS CRE developer prospecting tool for Los Angeles",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
