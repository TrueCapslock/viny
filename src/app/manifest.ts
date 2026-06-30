import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Viny - Vinnotater",
    short_name: "Viny",
    description: "Hold oversikt over viner du har smakt",
    start_url: "/",
    display: "standalone",
    background_color: "#fdfbf6",
    theme_color: "#cc1935",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  }
}
