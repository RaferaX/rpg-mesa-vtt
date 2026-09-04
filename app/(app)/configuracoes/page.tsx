"use client"

import { useState } from "react"
import { useSession, signOut } from "next-auth/react"

export default function Configuracoes() {
  const { data: session } = useSession()
  const [showConfirm, setShowConfirm] = useState(false)
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const res = await fetch("/api/user", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || "Não foi possível excluir a conta.")
      return
    }

    signOut({ callbackUrl: "/login" })
  }

  return (
    <main className="px-8 py-12 max-w-2xl">
      <h1 className="font-display text-3xl text-brass mb-8 tracking-wide">
        Configurações
      </h1>

      <section className="bg-parchment text-ink p-6 border-2 border-leather mb-6">
        <h2 className="font-display text-lg text-leather mb-4">
          Dados da conta
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block font-display text-sm text-leather mb-1">
              Nome
            </label>
            <input
              type="text"
              defaultValue={session?.user?.name ?? ""}
              disabled
              className="w-full bg-transparent border-b border-leather/40 py-2 outline-none text-lg opacity-60"
            />
          </div>

          <div>
            <label className="block font-display text-sm text-leather mb-1">
              Email
            </label>
            <input
              type="email"
              defaultValue={session?.user?.email ?? ""}
              disabled
              className="w-full bg-transparent border-b border-leather/40 py-2 outline-none text-lg opacity-60"
            />
          </div>
        </div>

        <button
          disabled
          className="mt-6 px-5 py-2 bg-seal/50 text-parchment font-display text-sm tracking-wide cursor-not-allowed"
        >
          Salvar alterações
        </button>
      </section>

      <section className="bg-parchment text-ink p-6 border-2 border-leather mb-6">
        <h2 className="font-display text-lg text-leather mb-4">
          Segurança
        </h2>
        <p className="text-sm text-leather/70 mb-4">
          Alteração de senha em breve.
        </p>
      </section>

      <section className="bg-parchment text-ink p-6 border-2 border-seal">
        <h2 className="font-display text-lg text-seal mb-2">
          Zona de perigo
        </h2>
        <p className="text-sm text-leather/70 mb-4">
          Excluir sua conta é permanente e não pode ser desfeito.
        </p>

        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="px-5 py-2 bg-seal text-parchment font-display text-sm tracking-wide hover:bg-seal/90 transition-colors"
          >
            Excluir conta
          </button>
        ) : (
          <form onSubmit={handleDelete} className="space-y-3">
            <label className="block font-display text-sm text-leather">
              Digite sua senha para confirmar
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-transparent border-b border-leather/40 py-2 outline-none focus:border-seal text-lg"
            />
            {error && <p className="text-seal text-sm">{error}</p>}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-seal text-parchment font-display text-sm tracking-wide hover:bg-seal/90 transition-colors disabled:opacity-50"
              >
                {loading ? "Excluindo..." : "Confirmar exclusão"}
              </button>
              <button
                type="button"
                onClick={() => { setShowConfirm(false); setPassword(""); setError("") }}
                className="px-5 py-2 bg-leather/30 text-ink font-display text-sm tracking-wide hover:bg-leather/40 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  )
}