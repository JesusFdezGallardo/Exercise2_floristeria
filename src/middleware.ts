// Middleware: se ejecuta ANTES de cada peticion a /admin. Si no hay cookie de admin valida, a la pagina de entrada.
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_ADMIN, esAdmin } from "@/lib/admin";

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/admin/entrar") return NextResponse.next();
  if (await esAdmin(req.cookies.get(COOKIE_ADMIN)?.value)) return NextResponse.next();
  return NextResponse.redirect(new URL("/admin/entrar", req.url));
}

// Solo para las rutas del panel: el resto de la tienda no pasa por aqui
export const config = { matcher: ["/admin/:path*"] };
