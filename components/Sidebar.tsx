"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function Sidebar() {
  const { data: session } = useSession()
  const pathname = usePathname()

  const links = [
    { href: "/mesas", label: "Minhas Mesas" },
    { href: "/configuracoes", label: "Configurações" },
  ]

  return (
    <aside className="w-64 shrink-0 bg-[#231B14] border-r-2 border-leather min-h-screen flex flex-col p-6">
      <div className="mb-10">
        <p className="font-display text-brass text-lg tracking-wide">RPG dos Crias</p>
      </div>

      <nav className="flex-1 space-y-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`block px-3 py-2 font-display text-sm tracking-wide transition-colors ${
              pathname === link.href
                ? "bg-leather/40 text-brass border-l-2 border-brass"
                : "text-parchment/60 hover:text-parchment hover:bg-leather/20"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-leather/40 pt-4 mt-4">
        <p className="text-sm text-parchment/50 mb-1">Logado como</p>
        <p className="font-display text-parchment mb-4 truncate">
          {session?.user?.name ?? "..."}
        </p>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full py-2 bg-seal/80 text-parchment font-display text-sm tracking-wide hover:bg-seal transition-colors"
        >
          Sair
        </button>
      </div>
    </aside>
  )
}