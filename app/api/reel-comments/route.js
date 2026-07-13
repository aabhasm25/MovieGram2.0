import { NextResponse } from "next/server";

const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export async function GET(request) {
  const videoId = new URL(request.url).searchParams.get("videoId") || "";
  if (!YOUTUBE_VIDEO_ID.test(videoId)) {
    return NextResponse.json({ error: "A valid YouTube video id is required.", comments: [] }, { status: 400 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ comments: [], unavailable: true });
  }

  const endpoint = new URL("https://www.googleapis.com/youtube/v3/commentThreads");
  endpoint.searchParams.set("part", "snippet");
  endpoint.searchParams.set("videoId", videoId);
  endpoint.searchParams.set("maxResults", "20");
  endpoint.searchParams.set("order", "relevance");
  endpoint.searchParams.set("textFormat", "plainText");
  endpoint.searchParams.set("key", apiKey);

  try {
    const response = await fetch(endpoint, { next: { revalidate: 300 } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const reason = payload?.error?.errors?.[0]?.reason || "youtube_comments_unavailable";
      if (reason === "commentsDisabled" || response.status === 403) {
        return NextResponse.json({ comments: [], unavailable: true });
      }
      return NextResponse.json({ error: reason, comments: [] }, { status: response.status });
    }

    const comments = (payload.items || []).map((entry) => {
      const snippet = entry?.snippet?.topLevelComment?.snippet || {};
      return {
        id: entry?.snippet?.topLevelComment?.id || entry?.id || `${videoId}:${snippet.publishedAt || "comment"}`,
        text: snippet.textDisplay || snippet.textOriginal || "",
        author: snippet.authorDisplayName || "YouTube viewer",
        avatar: snippet.authorProfileImageUrl || "",
        createdAt: snippet.publishedAt || "",
        source: "youtube",
        readOnly: true
      };
    }).filter((comment) => comment.text);

    return NextResponse.json({ comments });
  } catch (error) {
    console.warn("MovieGram YouTube comments request skipped", { videoId, message: error?.message });
    return NextResponse.json({ comments: [], unavailable: true });
  }
}
