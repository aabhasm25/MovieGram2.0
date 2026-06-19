export const friends = [
  { name: "Aabhas", handle: "@aabhas_07", avatar: "avatar-one" },
  { name: "Shruti", handle: "@shruti", avatar: "avatar-two" },
  { name: "Rohan", handle: "@rohan99", avatar: "avatar-three" },
  { name: "Arjun", handle: "@arjunfilms", avatar: "avatar-four" },
  { name: "Meera", handle: "@meera", avatar: "avatar-five" }
];

export const movies = [
  {
    title: "Dune: Part Two",
    slug: "dune-part-two",
    year: 2024,
    score: "8.6",
    runtime: "166 min",
    genres: ["Sci-Fi", "Adventure"],
    poster: "poster-dune",
    summary: "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family."
  },
  {
    title: "Dune",
    slug: "dune",
    year: 2021,
    score: "8.6",
    runtime: "155 min",
    genres: ["Sci-Fi", "Adventure"],
    poster: "poster-dune",
    summary: "A gifted young noble travels to the most dangerous planet in the universe to protect his family's future."
  },
  {
    title: "The Batman",
    slug: "the-batman",
    year: 2022,
    score: "8.0",
    runtime: "176 min",
    genres: ["Crime", "Drama"],
    poster: "poster-batman",
    summary: "Batman ventures into Gotham City's underworld when a sadistic killer leaves behind a trail of cryptic clues."
  },
  {
    title: "Joker",
    slug: "joker",
    year: 2019,
    score: "8.4",
    runtime: "122 min",
    genres: ["Crime", "Drama"],
    poster: "poster-joker",
    summary: "A struggling performer descends into chaos as isolation and cruelty reshape his life in Gotham City."
  },
  {
    title: "Interstellar",
    slug: "interstellar",
    year: 2014,
    score: "8.7",
    runtime: "169 min",
    genres: ["Sci-Fi", "Drama"],
    poster: "poster-interstellar",
    summary: "A former pilot joins a mission through a wormhole to find humanity a new home among the stars."
  },
  {
    title: "The Boys",
    slug: "the-boys",
    year: 2019,
    score: "8.7",
    runtime: "Series",
    genres: ["Action", "Satire"],
    poster: "poster-boys",
    summary: "A group of vigilantes takes on corrupt superheroes and the corporation that protects their image."
  },
  {
    title: "House of the Dragon",
    slug: "house-of-the-dragon",
    aliases: ["House"],
    year: 2022,
    score: "8.4",
    runtime: "Series",
    genres: ["Fantasy", "Drama"],
    poster: "poster-dragon",
    summary: "The Targaryen dynasty faces a succession crisis that threatens to tear the realm apart."
  },
  {
    title: "Oppenheimer",
    slug: "oppenheimer",
    year: 2023,
    score: "8.3",
    runtime: "180 min",
    genres: ["Biography", "Drama"],
    poster: "poster-oppenheimer",
    summary: "The story of J. Robert Oppenheimer and the creation of the atomic bomb during World War II."
  },
  {
    title: "The Shawshank Redemption",
    slug: "the-shawshank-redemption",
    year: 1994,
    score: "9.3",
    runtime: "142 min",
    genres: ["Drama"],
    poster: "poster-shawshank",
    summary: "Two imprisoned men bond over years, finding solace and eventual redemption through quiet acts of decency."
  },
  {
    title: "The Godfather",
    slug: "the-godfather",
    year: 1972,
    score: "9.2",
    runtime: "175 min",
    genres: ["Crime", "Drama"],
    poster: "poster-godfather",
    summary: "The aging patriarch of a crime dynasty transfers control of his empire to his reluctant son."
  },
  {
    title: "Pulp Fiction",
    slug: "pulp-fiction",
    year: 1994,
    score: "8.9",
    runtime: "154 min",
    genres: ["Crime", "Drama"],
    poster: "poster-pulp",
    summary: "Interwoven stories of criminals, boxers, and outcasts collide across Los Angeles."
  },
  {
    title: "Fight Club",
    slug: "fight-club",
    year: 1999,
    score: "8.8",
    runtime: "139 min",
    genres: ["Drama"],
    poster: "poster-fight",
    summary: "An insomniac office worker and a soap maker form an underground club with dangerous consequences."
  },
  {
    title: "Inception",
    slug: "inception",
    year: 2010,
    score: "8.8",
    runtime: "148 min",
    genres: ["Sci-Fi", "Action"],
    poster: "poster-interstellar",
    summary: "A skilled thief who steals secrets through dreams is offered a chance to have his past erased."
  }
];

export function getMovieBySlug(slug) {
  return movies.find((movie) => movie.slug === slug);
}

export function getMovieByTitle(title) {
  return movies.find((movie) => movie.title === title || movie.aliases?.includes(title));
}

export const feed = [
  {
    friend: friends[0],
    action: "watched",
    time: "2h",
    movie: "Dune: Part Two",
    movieSlug: "dune-part-two",
    poster: "poster-dune",
    rating: "8.6/10",
    text: "Absolutely stunning. The visuals, the scale, the storytelling. Denis Villeneuve is a genius.",
    likes: 342,
    comments: 26
  },
  {
    friend: friends[1],
    action: "reviewed",
    time: "5h",
    movie: "The Batman",
    movieSlug: "the-batman",
    poster: "poster-batman",
    rating: "4.0/5",
    text: "Dark, intense and absolutely fantastic.",
    likes: 188,
    comments: 14
  }
];

export const trending = [
  { title: "Dune", score: "8.6", poster: "poster-dune", slug: "dune" },
  { title: "The Boys", score: "8.7", poster: "poster-boys", slug: "the-boys" },
  { title: "House", score: "8.4", poster: "poster-dragon", slug: "house-of-the-dragon" }
];

export const watchlist = [
  { title: "Inception", year: 2010, added: "Added 20 May", poster: "poster-interstellar", slug: "inception" },
  { title: "The Shawshank Redemption", year: 1994, added: "Added 18 May", poster: "poster-shawshank", slug: "the-shawshank-redemption" },
  { title: "The Godfather", year: 1972, added: "Added 15 May", poster: "poster-godfather", slug: "the-godfather" },
  { title: "Pulp Fiction", year: 1994, added: "Added 10 May", poster: "poster-pulp", slug: "pulp-fiction" },
  { title: "Fight Club", year: 1999, added: "Added 8 May", poster: "poster-fight", slug: "fight-club" }
];

export const conversations = [
  {
    friend: friends[2],
    lastMessage: "That ending in Dune still has me thinking.",
    time: "2m",
    unread: 2
  },
  {
    friend: friends[1],
    lastMessage: "Add The Batman to tonight's watch party?",
    time: "18m",
    unread: 1
  },
  {
    friend: friends[3],
    lastMessage: "Sent you a list: Neo-noir favorites.",
    time: "1h",
    unread: 0
  },
  {
    friend: friends[4],
    lastMessage: "Interstellar rewatch this weekend?",
    time: "1d",
    unread: 0
  }
];

export const notifications = [
  {
    type: "activity",
    friend: friends[2],
    title: "Rohan watched Dune: Part Two",
    detail: "Rated it 8.6 after finishing his watch.",
    time: "2h"
  },
  {
    type: "like",
    friend: friends[1],
    title: "Shruti liked your Joker review",
    detail: "Your review is getting attention.",
    time: "4h"
  },
  {
    type: "comment",
    friend: friends[3],
    title: "Arjun commented on your list",
    detail: "\"Add Arrival to this sci-fi list.\"",
    time: "6h"
  },
  {
    type: "follow",
    friend: friends[4],
    title: "Meera started following you",
    detail: "You both love psychological thrillers.",
    time: "1d"
  },
  {
    type: "recommendation",
    friend: friends[0],
    title: "Watchlist recommendation",
    detail: "Because Inception is saved, try Tenet next.",
    time: "2d"
  }
];
