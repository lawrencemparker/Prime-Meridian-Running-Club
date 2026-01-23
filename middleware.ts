import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  if (pathname.startsWith("/auth")) return true;
  if (pathname.startsWith("/api")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/favicon")) return true;
  return false;
}

function localhostSafeCookieOptions(options: any) {
  const isProd = process.env.NODE_ENV === "production";
  if (isProd) return options;

  // Localhost-friendly cookie settings
  const nextOptions: any = { ...options };
  nextOptions.secure = false;
  nextOptions.sameSite = "lax";
  nextOptions.path = "/";

  if (nextOptions.domain) delete nextOptions.domain;

  return nextOptions;
}

export async function middleware(req: NextRequest) {
  let res = NextResponse.next();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnon) {
    return res;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, localhostSafeCookieOptions(options));
        });
      },
    },
  });

  // IMPORTANT: getUser() is the authoritative check for auth
  const { data, error } = await supabase.auth.getUser();
  const user = data?.user ?? null;

  const { pathname } = req.nextUrl;

  // If we're not public and not logged in, go to sign-in
  if (!isPublicPath(pathname) && !user) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/sign-in";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Keep logged-in users out of sign-in/up
  if (user && (pathname === "/auth/sign-in" || pathname === "/auth/sign-up")) {
    const url = req.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/((?!.*\\.(?:png|jpg|jpeg|gif|svg|ico|css|js|map)$).*)"],
};
