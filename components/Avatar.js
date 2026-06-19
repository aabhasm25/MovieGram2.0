export default function Avatar({ className = "avatar-one", size = "md" }) {
  return <span className={`avatar ${className} ${size}`} aria-hidden="true" />;
}
