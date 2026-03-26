// This frontend is deployed as a Next.js static export to S3/CloudFront, where
// server-side middleware does not execute. Route protection is handled client-side
// via Clerk's useAuth/isSignedIn hooks in each page component, and the backend
// enforces authentication via JWT validation on protected routes.
// This middleware is a no-op pass-through to remain compatible with the static
// export build while keeping the file in place for future server deployments.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
