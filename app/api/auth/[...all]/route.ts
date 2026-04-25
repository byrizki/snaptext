import { auth } from "@/lib/auth"; // path to your auth file
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest, NextResponse } from "next/server";

const handler = toNextJsHandler(auth);

export const GET = handler.GET;
export const POST = async (req: NextRequest) => {
    if (req.nextUrl.pathname.includes('/sign-up')) {
        return NextResponse.json({ error: "Registration is disabled" }, { status: 403 });
    }
    return handler.POST(req);
};
