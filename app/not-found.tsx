import Link from "next/link";
import { Arrow } from "@/components/icons";

export default function NotFound() {
  return (
    <main className="lost" id="main">
      <p className="eyebrow">
        <i />
        Page not found
      </p>
      <h1 className="h2">
        That page isn’t here. <em>The good stuff is.</em>
      </h1>
      <Link className="btn btn--dark" href="/">
        Back to the home page <Arrow size={18} />
      </Link>
    </main>
  );
}
