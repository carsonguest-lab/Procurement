import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireProjectWriter } from "@/lib/auth-helpers";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        if (!clientPayload) {
          throw new Error("Missing project for this upload.");
        }
        await requireProjectWriter(clientPayload);
        return {
          allowedContentTypes: ["application/pdf"],
          addRandomSuffix: true,
          maximumSizeInBytes: 25 * 1024 * 1024,
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (e) {
    console.error("schedule-upload token generation failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed." },
      { status: 400 }
    );
  }
}
