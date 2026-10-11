// Middleware: antes de /admin y /cuenta comprueba que HAYA COOKIE de sesion; si no, a /entrar y de vuelta aqui.
// No puede usar la BD: que la sesion sea valida y el rol lo comprueban la pagina y cada Server Action.
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION } from "@/lib/cuentas";

export function middleware(req: NextRequest) {
  if (req.cookies.has(COOKIE_SESION)) return NextResponse.next();
  const entrar = new URL("/entrar", req.url);
  entrar.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(entrar);
}

// Solo para las rutas privadas: el resto de la tienda no pasa por aqui
export const config = { matcher: ["/admin/:path*", "/cuenta/:path*"] };
