import { NextResponse } from "next/server";
import { runYouTubeReelAutomation } from "../../../../lib/youtubeReelAutomation.js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request) {
  const expected = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization") || "";
  if ((expected && authorization !== `Bearer ${expected}`) || (!expected && process.env.NODE_ENV === "production")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runYouTubeReelAutomation();
    return NextResponse.json(result, { status: result?.error ? 503 : 200 });
  } catch (error) {
    console.warn("MovieGram YouTube reel automation skipped", { message: error?.message });
    return NextResponse.json({ error: "Reel sync unavailable", detail: error?.message || "unknown" }, { status: 503 });
  }
}
