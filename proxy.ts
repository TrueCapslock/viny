export { auth as proxy } from "@/lib/auth"

export const config = {
  matcher: ["/((?!login|register|api/auth|api/register|_next/static|_next/image|favicon.ico).*)"],
}
