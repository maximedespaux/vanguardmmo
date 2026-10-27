import "./globals.css";
// La charte GENESIS se pose PAR-DESSUS globals.css : elle redéfinit les tokens
// et re-habille les composants. L'ordre des deux imports compte.
import "./genesis.css";
import { Providers } from "./providers";

export const metadata = {
  title: "GENESIS",
  description: "La guilde GENESIS sur Airborn — Winds of Rhisis",
  verification: { google: "DkXlgvmIl_FtET37wQvxLciYbVqSaE06C78NJdh54Pg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        {/* Polices auto-hébergées : Cinzel (titres, genesis.css) · Rubik (libellés, chiffres) · Athiti (corps) · Alef (accents) */}
        <link rel="preload" href="/fonts/Cinzel-VariableFont_wght.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/Rubik-VariableFont_wght.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/Athiti-Regular.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
