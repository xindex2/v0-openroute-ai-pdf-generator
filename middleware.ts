import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const pathname = url.pathname

  // Only process paths that start with /prompt/
  if (pathname.startsWith("/prompt/")) {
    // Extract the prompt text from after /prompt/
    const promptText = pathname.substring("/prompt/".length)

    // Decode the URL-encoded prompt and replace hyphens with spaces
    const decodedPrompt = decodeURIComponent(promptText.replace(/-/g, " "))

    // Redirect to the home page with the prompt as a query parameter
    url.pathname = "/"
    url.searchParams.set("prompt", decodedPrompt)

    return NextResponse.redirect(url)
  }

  // For all other paths, continue normal processing
  return NextResponse.next()
}

export const config = {
  // Only match paths that start with /prompt/
  matcher: ["/prompt/:path*"],
}
