import Link from "next/link";
export default function NotFound() {
  return (
    <div className="not-found">
      <span className="eyebrow">Page not found</span>
      <h1>A small detour.</h1>
      <p>That page isn’t here. The work still is.</p>
      <Link href="/work" className="button button-primary">
        Explore the work →
      </Link>
    </div>
  );
}
