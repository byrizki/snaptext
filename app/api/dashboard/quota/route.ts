import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getQuotaInfo, getEffectiveQuotaWithMeta } from "@/lib/quota";
import { headers } from "next/headers";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });

  const userId = session?.user?.id ?? null;
  const role = (session?.user?.role as string) ?? null;

  const [quota, meta] = await Promise.all([
    session?.user
      ? getQuotaInfo(userId, null, role)
      : getQuotaInfo(null, null, null),
    getEffectiveQuotaWithMeta(userId, null, role),
  ]);

  return NextResponse.json({
    ...quota,
    resetPeriod: meta.resetPeriod,
    isAnonymous: !session?.user,
  });
}
