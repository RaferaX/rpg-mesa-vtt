"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"

function CursorPicker() {
  const [selected, setSelected] = useState("default")

  useEffect(() => {
    const saved = localStorage.getItem("cursorStyle") || "default"
    setSelected(saved)
  }, [])

  function applyCursor(style: string) {
    document.body.classList.remove("cursor-sword", "cursor-dagger", "cursor-staff")
    if (style !== "default") {
      document.body.classList.add(`cursor-${style}`)
    }
    localStorage.setItem("cursorStyle", style)
    setSelected(style)
  }

  const options = [
    { id: "default", label: "Padrão" },
    { id: "sword", label: "Espada" },
    { id: "dagger", label: "Adaga" },
    { id: "staff", label: "Cajado" },
  ]

  return (
    <section className="bg-parchment text-ink p-6 border-2 border-leather mb-6">
      <h2 className="font-display text-lg text-leather mb-4">
        Cursores personalizados
      </h2>
      <div className="grid grid-cols-4 gap-3">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => applyCursor(opt.id)}
            className={`py-3 font-display text-sm border-2 transition-colors ${
              selected === opt.id
                ? "border-seal bg-seal/10 text-seal"
                : "border-leather/30 text-leather/70 hover:border-leather"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </section>
  )
}

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

      <CursorPicker />

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