import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  applySecurityHeaders,
  generateNonce,
  PERMISSIONS_POLICY,
} from "@/lib/security-headers";

// Routes that don't require authentication.
// Erweitern: füge Pfade hinzu, die public bleiben sollen (z. B. /signup, /landing).
const publicRoutes = ["/", "/login", "/api/health"];

function isPublic(pathname: string): boolean {
  return publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/** Setzt die Per-Request-Header auf eine fertige Response. */
function withSecurityHeaders(response: NextResponse, csp: string): NextResponse {
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Permissions-Policy", PERMISSIONS_POLICY);
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Nonce und CSP werden fuer JEDEN Durchlauf erzeugt — auch fuer oeffentliche
  // Routen. Die Startseite und /login ungeschuetzt zu lassen waere genau
  // verkehrt: Das sind die Seiten, die jeder ohne Anmeldung erreicht.
  const nonce = generateNonce();
  const requestHeaders = new Headers(request.headers);
  const csp = applySecurityHeaders(requestHeaders, nonce);

  if (isPublic(pathname)) {
    return withSecurityHeaders(
      NextResponse.next({ request: { headers: requestHeaders } }),
      csp,
    );
  }

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response = NextResponse.next({ request: { headers: requestHeaders } });
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return withSecurityHeaders(
      NextResponse.redirect(new URL("/login", request.url)),
      csp,
    );
  }

  return withSecurityHeaders(response, csp);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
