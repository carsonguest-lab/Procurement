import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { seedDemoData } from "@/lib/seed-data";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const expected = process.env.SEED_TOKEN;

  if (!expected) {
    return NextResponse.json(
      { error: "SEED_TOKEN is not configured on this deployment." },
      { status: 500 }
    );
  }

  if (!token || token !== expected) {
    return NextResponse.json({ error: "Invalid or missing token." }, { status: 401 });
  }

  try {
    const result = await seedDemoData(prisma);

    return NextResponse.json({
      message: "Demo data loaded.",
      ...result,
      loginPassword: "password123",
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: "Seeding failed.",
        detail: e instanceof Error ? e.message : String(e),
        hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      },
      { status: 500 }
    );
  }
}
