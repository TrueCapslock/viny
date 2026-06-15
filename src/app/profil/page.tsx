"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Grape } from "@/app/_components/icons"

export default function ProfilePage() {
  const { data: session } = useSession()
  const router = useRouter()

  return (
    <div className="flex-1 px-4 pt-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-wine-gradient flex items-center justify-center mx-auto">
          <Grape className="w-8 h-9 text-gold-300" />
        </div>
        <h1 className="text-xl font-bold text-wine-800 mt-3">Profil</h1>
        <p className="text-sm text-wine-400 mt-0.5">{session?.user?.email}</p>
      </div>

      <div className="bg-white rounded-2xl border border-cream-200 p-4 space-y-3">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full text-left text-sm text-red-600 font-medium px-3 py-2.5 rounded-xl hover:bg-red-50 transition-colors"
        >
          Logg ut
        </button>
      </div>
    </div>
  )
}
