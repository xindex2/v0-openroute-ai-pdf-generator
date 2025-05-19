import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()

  // Skip middleware for API routes, static files, etc.
  if (
    url.pathname === "/" ||
    url.pathname.startsWith("/_next") ||
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/favicon") ||
    url.pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  // Extract the prompt from the URL path
  const promptText = url.pathname.substring(1) // Remove the leading slash

  // Decode the URL-encoded prompt and replace hyphens with spaces
  const decodedPrompt = decodeURIComponent(promptText.replace(/-/g, " "))

  // Redirect to the home page with the prompt as a query parameter
  url.pathname = "/"
  url.searchParams.set("prompt", decodedPrompt)

  return NextResponse.redirect(url)
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
