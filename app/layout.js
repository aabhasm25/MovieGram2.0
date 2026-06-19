import "./globals.css";

export const metadata = {
  title: "MovieGram",
  description: "A social movie tracking app prototype"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
