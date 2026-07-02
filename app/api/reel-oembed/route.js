import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const META_APP_ACCESS_TOKEN = process.env.META_APP_ACCESS_TOKEN || (META_APP_ID && META_APP_SECRET ? `${META_APP_ID}|${META_APP_SECRET}` : "");

function serverSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

function metaSourceFromUrl(source = "", sourceUrl = "") {
  try {
    const host = new URL(sourceUrl).hostname.replace(/^www\./, "").toLowerCase();
    if (host.endsWith("instagram.com")) return "instagram";
    if (host.endsWith("facebook.com")) return "facebook";
  } catch {
    return source;
  }
  return source;
}

function instagramEmbedUrl(sourceUrl = "") {
  try {
    const url = new URL(sourceUrl);
    const parts = url.pathname.split("/").filter(Boolean);
    const markerIndex = parts.findIndex((part) => ["reel", "p", "tv"].includes(part));
    const shortcode = markerIndex >= 0 ? parts[markerIndex + 1] : "";
    return shortcode ? `https://www.instagram.com/${parts[markerIndex] || "reel"}/${shortcode}/embed` : "";
  } catch {
    return "";
  }
}

function extractIframeSrc(html = "") {
  const match = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  return match?.[1] ? match[1].replace(/&amp;/g, "&") : "";
}

async function cacheOembed(sourceUrl, payload) {
  const client = serverSupabase();
  if (!client) return;
  const now = new Date().toISOString();
  const fullUpdate = {
    embed_html: payload.embed_html || null,
    embed_url: payload.embed_url || null,
    oembed_json: payload.oembed_json || null,
    thumbnail_url: payload.thumbnail_url || null,
    video_title: payload.title || null,
    channel_title: payload.author_name || null,
    embed_status: payload.embed_status,
    playable: true,
    last_embed_checked_at: now,
    last_checked_at: now,
    updated_at: now
  };
  const { error } = await client.from("reel_cache").update(fullUpdate).eq("source_url", sourceUrl);
  if (!error) return;

  const fallbackUpdate = {
    embed_html: payload.embed_html || null,
    embed_url: payload.embed_url || null,
    thumbnail_url: payload.thumbnail_url || null,
    video_title: payload.title || null,
    channel_title: payload.author_name || null,
    playable: true,
    last_checked_at: now,
    updated_at: now
  };
  await client.from("reel_cache").update(fallbackUpdate).eq("source_url", sourceUrl);
}

async function markEmbedStatus(sourceUrl, embedStatus) {
  const client = serverSupabase();
  if (!client) return;
  const now = new Date().toISOString();
  const { error } = await client.from("reel_cache").update({
    embed_status: embedStatus,
    last_embed_checked_at: now,
    updated_at: now
  }).eq("source_url", sourceUrl);
  if (!error) return;
  await client.from("reel_cache").update({ updated_at: now }).eq("source_url", sourceUrl);
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ embed_status: "unsupported", error: "Invalid request." }, { status: 400 });
  }

  const sourceUrl = String(body?.source_url || "").trim();
  const source = metaSourceFromUrl(String(body?.source || ""), sourceUrl);
  if (!sourceUrl || !["instagram", "facebook"].includes(source)) {
    return NextResponse.json({ embed_status: "unsupported", error: "Only Instagram and Facebook source URLs are supported." }, { status: 400 });
  }

  if (!META_APP_ACCESS_TOKEN) {
    await markEmbedStatus(sourceUrl, "token_missing");
    return NextResponse.json({ embed_status: "token_missing", disabled: true });
  }

  const endpoint = source === "instagram"
    ? "https://graph.facebook.com/v20.0/instagram_oembed"
    : "https://graph.facebook.com/v20.0/oembed_video";
  const params = new URLSearchParams({
    url: sourceUrl,
    access_token: META_APP_ACCESS_TOKEN,
    maxwidth: "420",
    omitscript: source === "instagram" ? "true" : "false"
  });

  try {
    const response = await fetch(`${endpoint}?${params.toString()}`, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      await markEmbedStatus(sourceUrl, "failed");
      return NextResponse.json({ embed_status: "failed", error: data?.error?.message || `Meta oEmbed ${response.status}` }, { status: 200 });
    }

    const embedUrl = extractIframeSrc(data.html || "") || (source === "instagram" ? instagramEmbedUrl(sourceUrl) : "");
    const payload = {
      embed_status: "ready",
      embed_html: data.html || "",
      embed_url: embedUrl,
      thumbnail_url: data.thumbnail_url || "",
      title: data.title || "",
      author_name: data.author_name || data.provider_name || "",
      oembed_json: data
    };
    await cacheOembed(sourceUrl, payload);
    return NextResponse.json(payload);
  } catch (error) {
    await markEmbedStatus(sourceUrl, "failed");
    return NextResponse.json({ embed_status: "failed", error: error?.message || "Meta oEmbed failed." }, { status: 200 });
  }
}
