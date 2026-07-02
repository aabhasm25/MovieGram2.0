export const creatorSourceSeeds = [
  { platform: "youtube", source_name: "Marvel Entertainment", source_url: "https://www.youtube.com/@marvel", source_type: "official_channel", approved: true, quality_score: 95, trust_score: 95, keywords: ["marvel", "clip", "trailer"], genres: ["superhero", "action"] },
  { platform: "youtube", source_name: "HBO / Max", source_url: "https://www.youtube.com/@HBO", source_type: "official_channel", approved: true, quality_score: 94, trust_score: 94, keywords: ["hbo", "max", "official"], genres: ["drama", "series"] },
  { platform: "youtube", source_name: "Netflix", source_url: "https://www.youtube.com/@Netflix", source_type: "ott", approved: true, quality_score: 93, trust_score: 93, keywords: ["netflix", "clip", "trailer"], genres: ["movie", "tv"] },
  { platform: "youtube", source_name: "Prime Video", source_url: "https://www.youtube.com/@PrimeVideo", source_type: "ott", approved: true, quality_score: 91, trust_score: 91, keywords: ["prime video", "clip", "trailer"], genres: ["movie", "tv"] },
  { platform: "youtube", source_name: "Disney", source_url: "https://www.youtube.com/@Disney", source_type: "studio", approved: true, quality_score: 91, trust_score: 91, keywords: ["disney", "official"], genres: ["family", "adventure"] },
  { platform: "youtube", source_name: "Pixar", source_url: "https://www.youtube.com/@Pixar", source_type: "studio", approved: true, quality_score: 91, trust_score: 91, keywords: ["pixar", "official"], genres: ["animation"] },
  { platform: "youtube", source_name: "Warner Bros. Pictures", source_url: "https://www.youtube.com/@WarnerBrosPictures", source_type: "studio", approved: true, quality_score: 94, trust_score: 94, keywords: ["warner bros", "clip", "trailer"], genres: ["movie"] },
  { platform: "youtube", source_name: "Sony Pictures Entertainment", source_url: "https://www.youtube.com/@SonyPictures", source_type: "studio", approved: true, quality_score: 92, trust_score: 92, keywords: ["sony pictures", "official"], genres: ["movie"] },
  { platform: "youtube", source_name: "Universal Pictures", source_url: "https://www.youtube.com/@UniversalPictures", source_type: "studio", approved: true, quality_score: 92, trust_score: 92, keywords: ["universal", "official"], genres: ["movie"] },
  { platform: "youtube", source_name: "A24", source_url: "https://www.youtube.com/@A24", source_type: "studio", approved: true, quality_score: 90, trust_score: 90, keywords: ["a24", "official"], genres: ["indie", "drama"] },
  { platform: "youtube", source_name: "Rotten Tomatoes Trailers", source_url: "https://www.youtube.com/@RottenTomatoesTRAILERS", source_type: "creator", approved: true, quality_score: 86, trust_score: 82, keywords: ["trailer", "official"], genres: ["movie"] },
  { platform: "youtube", source_name: "Movieclips", source_url: "https://www.youtube.com/@MOVIECLIPS", source_type: "creator", approved: true, quality_score: 84, trust_score: 80, keywords: ["clip", "scene"], genres: ["movie"] },
  { platform: "youtube", source_name: "IGN", source_url: "https://www.youtube.com/@IGN", source_type: "creator", approved: true, quality_score: 82, trust_score: 76, keywords: ["clip", "trailer"], genres: ["movie", "tv"] },
  { platform: "youtube", source_name: "KinoCheck", source_url: "https://www.youtube.com/@KinoCheck", source_type: "creator", approved: true, quality_score: 80, trust_score: 74, keywords: ["clip", "trailer"], genres: ["movie"] },
  { platform: "instagram", source_name: "Marvel", source_url: "https://www.instagram.com/marvel/", source_type: "official_profile", approved: true, quality_score: 94, trust_score: 94, keywords: ["marvel"], genres: ["superhero", "action"] },
  { platform: "instagram", source_name: "HBO", source_url: "https://www.instagram.com/hbo/", source_type: "official_profile", approved: true, quality_score: 92, trust_score: 92, keywords: ["hbo"], genres: ["drama", "series"] },
  { platform: "instagram", source_name: "Netflix", source_url: "https://www.instagram.com/netflix/", source_type: "ott", approved: true, quality_score: 92, trust_score: 92, keywords: ["netflix"], genres: ["movie", "tv"] },
  { platform: "instagram", source_name: "Prime Video", source_url: "https://www.instagram.com/primevideo/", source_type: "ott", approved: true, quality_score: 90, trust_score: 90, keywords: ["prime video"], genres: ["movie", "tv"] },
  { platform: "instagram", source_name: "Disney", source_url: "https://www.instagram.com/disney/", source_type: "studio", approved: true, quality_score: 90, trust_score: 90, keywords: ["disney"], genres: ["family", "adventure"] },
  { platform: "instagram", source_name: "Pixar", source_url: "https://www.instagram.com/pixar/", source_type: "studio", approved: true, quality_score: 90, trust_score: 90, keywords: ["pixar"], genres: ["animation"] },
  { platform: "instagram", source_name: "A24", source_url: "https://www.instagram.com/a24/", source_type: "studio", approved: true, quality_score: 90, trust_score: 90, keywords: ["a24"], genres: ["indie", "drama"] },
  { platform: "facebook", source_name: "Marvel", source_url: "https://www.facebook.com/Marvel/", source_type: "official_profile", approved: true, quality_score: 90, trust_score: 90, keywords: ["marvel"], genres: ["superhero", "action"] },
  { platform: "facebook", source_name: "Netflix", source_url: "https://www.facebook.com/netflix/", source_type: "ott", approved: true, quality_score: 88, trust_score: 88, keywords: ["netflix"], genres: ["movie", "tv"] },
  { platform: "facebook", source_name: "Disney", source_url: "https://www.facebook.com/Disney/", source_type: "studio", approved: true, quality_score: 88, trust_score: 88, keywords: ["disney"], genres: ["family", "adventure"] }
];

export const disabledCreatorSourceTodos = [
  { platform: "instagram", source_name: "Warner Bros.", source_url: "", source_type: "studio", approved: false, note: "Add exact verified Instagram profile before enabling." },
  { platform: "instagram", source_name: "Sony Pictures", source_url: "", source_type: "studio", approved: false, note: "Add exact verified Instagram profile before enabling." },
  { platform: "instagram", source_name: "Universal Pictures", source_url: "", source_type: "studio", approved: false, note: "Add exact verified Instagram profile before enabling." },
  { platform: "facebook", source_name: "HBO / Max", source_url: "", source_type: "official_profile", approved: false, note: "Add exact verified Facebook page before enabling." },
  { platform: "facebook", source_name: "Prime Video", source_url: "", source_type: "ott", approved: false, note: "Add exact verified Facebook page before enabling." }
];
