import { NextResponse } from "next/server";
import { createGateway } from "ai";

export async function GET() {
  const apiKey = process.env.AI_GATEWAY_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "AI_GATEWAY_API_KEY not configured" },
      { status: 500 },
    );
  }

  try {
    const freeGW = createGateway({ apiKey: process.env.AI_GATEWAY_API_KEY });
    const paidGW = process.env.AI_GATEWAY_API_KEY_PAID
      ? createGateway({ apiKey: process.env.AI_GATEWAY_API_KEY_PAID })
      : null;

    const freeBalance = await freeGW.getCredits();
    const paidBalance = paidGW ? await paidGW.getCredits() : { credits: 0 };

    return NextResponse.json({
      freeBalance,
      paidBalance,
    });
  } catch (error: any) {
    console.error("Gateway balance fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
