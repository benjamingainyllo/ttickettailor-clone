import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — this is critical for keeping the user logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes — redirect to login if not authenticated
  const protectedPaths = [
    "/overview",
    "/audience",
    "/revenue",
    "/payouts",
    "/events",
    "/integrations",
    "/settings",
    "/onboarding",
  ];

  const isProtected = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // An account made by clicking a link in an email has no password until
  // the onboarding gate takes one. Somebody who closes the tab at that point
  // has a real account they can never sign into again, which is precisely
  // how the first lockout happened. So anyone signed in without a password
  // goes back to finish, from wherever they land.
  //
  // user_metadata rides along in the token, so this costs no extra query.
  // Google accounts are exempt — they sign in with Google, not a password.
  if (
    user &&
    isProtected &&
    !request.nextUrl.pathname.startsWith("/onboarding") &&
    user.app_metadata?.provider === "email" &&
    !user.user_metadata?.password_set
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding";
    return NextResponse.redirect(url);
  }

  // If user is authenticated and on the login page, redirect to dashboard.
  // `/` is the public marketing page and stays reachable when signed in.
  if (request.nextUrl.pathname === "/login" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/overview";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Public storefront routes (handled separately)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
