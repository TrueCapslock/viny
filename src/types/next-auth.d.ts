import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface User {
    id: string
    image?: string | null
    prefersBeer?: boolean
    prefersDarkMode?: boolean
    isAdmin?: boolean
    wineapiKey?: string | null
    openRouterKey?: string | null
    visionModel?: string | null
  }
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      prefersBeer?: boolean
      prefersDarkMode?: boolean
      isAdmin?: boolean
      beerModeDisabled?: boolean
      wineapiKey?: string | null
      openRouterKey?: string | null
      visionModel?: string | null
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    image?: string | null
    prefersBeer?: boolean
    prefersDarkMode?: boolean
    isAdmin?: boolean
    beerModeDisabled?: boolean
    wineapiKey?: string | null
    openRouterKey?: string | null
    visionModel?: string | null
  }
}
