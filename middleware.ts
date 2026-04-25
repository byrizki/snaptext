import { betterFetch } from "@better-fetch/fetch";
import { NextResponse, type NextRequest } from "next/server";

export default async function authMiddleware(request: NextRequest) {
    const isAdminUI = request.nextUrl.pathname.startsWith('/admin') && request.nextUrl.pathname !== '/admin/login';
    const isAdminAPI = request.nextUrl.pathname.startsWith('/api/admin');

    if (isAdminUI || isAdminAPI) {
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
            if (isAdminAPI) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
            return NextResponse.redirect(new URL("/admin/login", request.url));
        }
    }
    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*", "/api/admin/:path*"],
};
