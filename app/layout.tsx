import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/source-sans-3";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "CENTRA", template: "%s · CENTRA" },
  description: "Tata kelola kepanitiaan kampus: akses berbasis peran, progres divisi (IPMS), dan persuratan birokrasi.",
};
export const viewport: Viewport = { themeColor: "#0d2027" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
