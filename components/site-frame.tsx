"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Providers } from "@/components/providers";
import { AvatarGuideGate } from "@/components/avatar-guide-gate";

/** Keep public pages statically renderable; private access is enforced on the server. */
export function SiteFrame({
  children,
  navbar,
  footer,
  structuredData,
}: {
  children: ReactNode;
  navbar: ReactNode;
  footer: ReactNode;
  structuredData: ReactNode;
}) {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return children;
  return (
    <>
      <Providers>
        <div className="page-frame">
          {navbar}
          <main id="main">{children}</main>
          {footer}
        </div>
        <AvatarGuideGate />
      </Providers>
      {structuredData}
    </>
  );
}
