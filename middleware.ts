import { betterFetch } from "@better-fetch/fetch";
import { NextResponse, type NextRequest } from "next/server";

export default async function authMiddleware(request: NextRequest) {
    const isAdminUI = request.nextUrl.pathname.startsWith('/dashboard/admin');
    const isAdminAPI = request.nextUrl.pathname.startsWith('/api/admin');
    
    const isDashboardUI = request.nextUrl.pathname.startsWith('/dashboard') && !isAdminUI;
    const isAuthUI = request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup';

    if (isAdminUI || isAdminAPI || isDashboardUI || isAuthUI) {
        const { data: session } = await betterFetch<any>(
            "/api/auth/get-session",
            {
                baseURL: request.nextUrl.origin,
                headers: {
                    cookie: request.headers.get("cookie") || "",
                },
            },
        );

        if (!session) {
            if (isAuthUI) {
                return NextResponse.next();
            }
            if (isAdminAPI) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
            return NextResponse.redirect(new URL("/login", request.url));
        }

        if (isAuthUI) {
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }

        if ((isAdminUI || isAdminAPI) && session?.user?.role !== "admin") {
            if (isAdminUI) {
                return NextResponse.redirect(new URL("/dashboard", request.url));
            }
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
    }
    return NextResponse.next();
}

export const config = {
    matcher: ["/api/admin/:path*", "/dashboard/:path*", "/login", "/signup"],
};
