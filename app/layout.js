import "./globals.css";

export const metadata = {
  title: "MovieGram",
  description: "A social movie tracking app prototype"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://www.youtube.com" />
        <link rel="preconnect" href="https://www.youtube-nocookie.com" />
        <link rel="preconnect" href="https://i.ytimg.com" />
        <link rel="preconnect" href="https://img.youtube.com" />
        <link rel="preconnect" href="https://www.google.com" />
        <link rel="dns-prefetch" href="https://googlevideo.com" />
      </head>
      <body>{children}</body>
    </html>
  );
}
