import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { Cabecera } from "@/components/cabecera";
import { SincronizarCarrito } from "@/components/sincronizar-carrito";
import { Toaster } from "@/components/ui/sonner";
import { usuarioActual } from "@/lib/sesion";
import { TIENDA } from "@/lib/tienda";
import "./globals.css";

// shadcn usa la variable --font-sans: le damos la fuente Geist
const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Fraunces (serif, licencia OFL) solo para los titulos: globals.css la aplica a h1-h3
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

// Cada pagina pone solo su parte del titulo ("Carrito") y Next anade el nombre de la tienda
export const metadata: Metadata = {
  title: { default: TIENDA.nombre, template: `%s · ${TIENDA.nombre}` },
  description: TIENDA.descripcion,
};

// El layout envuelve TODAS las paginas: la cabecera se pinta una vez y no se recarga al navegar.
// Lee la sesion para saber de quien es el carrito (esto hace dinamicas todas las paginas).
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const usuario = await usuarioActual();
  return (
    // las variables de fuente van en <html>: el globals.css de shadcn aplica font-sans a html
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable}`}>
      <body className="antialiased">
        <SincronizarCarrito usuarioId={usuario?.id ?? null} />
        <Cabecera />
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
