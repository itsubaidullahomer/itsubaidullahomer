import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { MDXRemote } from "next-mdx-remote/rsc";
import { Children, type ReactNode } from "react";
import { slugify } from "./utils";
export async function getContent(kind: "work" | "writing", slug: string) {
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error("Invalid content slug");
  return readFile(join(process.cwd(), "content", kind, `${slug}.mdx`), "utf8");
}
export function headings(source: string) {
  return [...source.matchAll(/^## (.+)$/gm)].map((m) => ({
    title: m[1],
    id: slugify(m[1]),
  }));
}
export function Article({ source }: { source: string }) {
  return (
    <div className="prose">
      <MDXRemote
        source={source}
        components={{
          h2: ({ children }: { children?: ReactNode }) => (
            <h2 id={slugify(Children.toArray(children).join(""))}>
              {children}
            </h2>
          ),
        }}
      />
    </div>
  );
}
