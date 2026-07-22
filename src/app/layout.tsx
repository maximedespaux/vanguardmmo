import "./globals.css";
import { Providers } from "./providers";

export const metadata = {
  title: "Vanguard Hub",
  description: 'Gestion de la Guilde "Vanguard"',
  verification: { google: "DkXlgvmIl_FtET37wQvxLciYbVqSaE06C78NJdh54Pg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        {/* Polices auto-hébergées (@font-face dans globals.css) : Rubik (titres) · Athiti (corps) · Alef (accents) */}
        <link rel="preload" href="/fonts/Rubik-VariableFont_wght.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/Athiti-Regular.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
