import { NextResponse } from "next/server"
import { searchProducts, VinmonopoletError } from "@/lib/vinmonopolet"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")
  const maxResults = searchParams.get("maxResults")

  if (!query || query.length < 2) {
    return NextResponse.json({ error: "Query must be at least 2 characters" }, { status: 400 })
  }

  try {
    const products = await searchProducts(query, maxResults ? parseInt(maxResults) : 10)
    return NextResponse.json(products)
  } catch (error) {
    if (error instanceof VinmonopoletError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
