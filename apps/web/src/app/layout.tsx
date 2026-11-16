import type { Metadata } from "next";
import Script from "next/script";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme/theme-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetBrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });
const themeInitializationScript =
  'try{const theme=localStorage.getItem("qagent-theme");if(theme==="dark"||theme==="light")document.documentElement.dataset.theme=theme;}catch{}';

export const metadata: Metadata = {
  title: "QAgent IA | Qualidade com inteligência",
  description: "Seu espaço de Quality Assurance para trabalhar e aprender.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${jetBrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <Script
          id="qagent-theme"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitializationScript }}
        />
      </head>
      <body className="font-sans">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
