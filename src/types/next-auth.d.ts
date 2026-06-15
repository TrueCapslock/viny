import "next-auth"

declare module "next-auth" {
  interface User {
    id: string
  }
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
    }
  }
}
