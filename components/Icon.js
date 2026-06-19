const icons = {
  home: (
    <path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" />
  ),
  reels: (
    <>
      <rect x="4" y="5" width="16" height="16" rx="3" />
      <path d="m8 5 3 5m3-5 3 5M4 10h16m-8 4 4 2.5-4 2.5z" />
    </>
  ),
  log: (
    <>
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  messages: (
    <>
      <path d="M4 5h16v11H8l-4 4z" />
      <path d="M8 9h8M8 12h5" />
    </>
  ),
  bell: (
    <>
      <path d="M18 16v-5a6 6 0 1 0-12 0v5l-2 3h16z" />
      <path d="M10 21h4" />
    </>
  ),
  heart: (
    <path d="M12 21s-7-4.4-9-9a5 5 0 0 1 8-5 5 5 0 0 1 8 5c-2 4.6-9 9-9 9z" />
  ),
  comment: (
    <path d="M5 5h14v10H9l-4 4z" />
  ),
  send: (
    <path d="m3 11 18-8-8 18-2-8z" />
  ),
  bookmark: (
    <path d="M6 4h12v17l-6-4-6 4z" />
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </>
  )
};

export default function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {icons[name]}
    </svg>
  );
}
