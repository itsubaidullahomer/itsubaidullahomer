import Image from "next/image";
import type { ReactNode } from "react";

/** Also serves as the loading/error fallback for a future live renderer. */
export function AvatarPoster() {
  return (
    <Image
      className="avatar-poster"
      src="/images/avatar/ubaid-v1.webp"
      alt=""
      fill
      sizes="(max-width: 540px) 290px, 365px"
      priority
    />
  );
}

/** The frame and label stay fixed when a rigged renderer replaces the poster. */
export function AvatarVisual({ children }: { children?: ReactNode }) {
  return (
    <div className="avatar-picture">
      <div
        className="avatar-renderer"
        role="img"
        aria-label="Stylized 3D avatar of Ubaidullah Omer"
      >
        {children ?? <AvatarPoster />}
      </div>
      <div className="avatar-label">
        <strong>Meet AI Ubaid.</strong>
        <span>An AI version. Same curiosity.</span>
      </div>
    </div>
  );
}
