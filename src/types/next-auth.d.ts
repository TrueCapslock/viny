import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface User {
    id: string
    image?: string | null
    prefersBeer?: boolean
    isAdmin?: boolean
  }
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      prefersBeer?: boolean
      isAdmin?: boolean
      beerModeDisabled?: boolean
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    image?: string | null
    prefersBeer?: boolean
    isAdmin?: boolean
    beerModeDisabled?: boolean
  }
}
