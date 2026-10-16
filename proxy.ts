import { NextResponse, type NextRequest } from "next/server";
import { refreshJobsSession } from "@/lib/jobs/server";

export async function proxy(request: NextRequest) {
  const isAdminHost =
    request.headers.get("host")?.split(":")[0].toLowerCase() ===
    "admin.itsubaidullahomer.com";
  const path = request.nextUrl.pathname;
  const isAdmin =
    isAdminHost ||
    path === "/admin" ||
    path.startsWith("/admin/") ||
    path.startsWith("/api/jobs/");
  const makeResponse = (req: NextRequest) => {
    const target = req.nextUrl.clone();
    const redirect = isAdminHost && path === "/";
    if (redirect) {
      target.pathname = "/admin";
      target.hostname = "admin.itsubaidullahomer.com";
      target.protocol = "https:";
      target.port = "";
    }
    const response = redirect
      ? NextResponse.redirect(target)
      : NextResponse.next({ request: { headers: req.headers } });
    if (isAdmin) {
      response.headers.set("Cache-Control", "private, no-store");
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
    }
    return response;
  };
  return isAdmin
    ? refreshJobsSession(request, makeResponse)
    : makeResponse(request);
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|models/|audio/|decoders/).*)",
  ],
};
