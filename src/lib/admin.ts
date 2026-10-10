// Proteccion sencilla del panel de admin (demo): una contrasena en ADMIN_PASSWORD y una cookie httpOnly.
// La cookie guarda una HUELLA de la contrasena (SHA-256), nunca la contrasena.
export const COOKIE_ADMIN = "admin_volta";

export async function huella(texto: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`tienda-volta:${texto}`));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

// ¿La cookie que trae el navegador corresponde a la contrasena actual?
export async function esAdmin(valorCookie: string | undefined): Promise<boolean> {
  const clave = process.env.ADMIN_PASSWORD;
  if (!clave || !valorCookie) return false;
  return valorCookie === (await huella(clave));
}
