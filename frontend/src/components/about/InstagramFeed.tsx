import { Play } from "lucide-react";
import type { InstagramPost } from "@/lib/server/instagram";
import ScrollRow from "./ScrollRow";

/**
 * Últimos posts de Instagram (los trae el servidor con la cuenta conectada),
 * como fotos del diseño de la página en el carrusel. Cada una abre el post.
 */
export default function InstagramFeed({ posts }: { posts: InstagramPost[] }) {
  return (
    <ScrollRow>
      {posts.map((post) => (
        <a
          key={post.id}
          href={post.permalink}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-ink"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- la foto viene del CDN de Instagram y su URL cambia. */}
          <img
            src={post.imageUrl}
            alt={post.caption ? post.caption.slice(0, 120) : "Publicación de Instagram"}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
          {post.isVideo && (
            <span className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-ink/60 text-paper">
              <Play aria-hidden="true" className="size-4 fill-current" />
            </span>
          )}
          {post.caption && (
            <span className="absolute inset-x-0 bottom-0 line-clamp-2 bg-[linear-gradient(to_top,rgb(18_18_18/0.75),transparent)] px-4 pb-4 pt-12 text-sm text-paper opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              {post.caption}
            </span>
          )}
        </a>
      ))}
    </ScrollRow>
  );
}
