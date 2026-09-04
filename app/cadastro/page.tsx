"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function Cadastro() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || "Não foi possível criar a conta.")
      return
    }

    router.push("/login")
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-[radial-gradient(ellipse_at_center,_#2a2119_0%,_#1B1712_70%)]">
      <div className="w-full max-w-md">
        <h1 className="font-display text-3xl text-center text-brass mb-1 tracking-wide">
          Nova Jornada
        </h1>
        <p className="text-center text-parchment/60 text-sm mb-8">
          Crie sua conta para entrar nas mesas
        </p>

        <form
          onSubmit={handleSubmit}
          className="bg-parchment text-ink px-8 py-10 border-2 border-leather relative"
          style={{ boxShadow: "0 0 0 1px #1B1712, 0 20px 40px rgba(0,0,0,0.5)" }}
        >
          <div className="space-y-5">
            <div>
              <label className="block font-display text-sm text-leather mb-1">
                Nome
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-transparent border-b border-leather/40 py-2 outline-none focus:border-seal transition-colors font-body text-lg"
              />
            </div>

            <div>
              <label className="block font-display text-sm text-leather mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-transparent border-b border-leather/40 py-2 outline-none focus:border-seal transition-colors font-body text-lg"
              />
            </div>

            <div>
              <label className="block font-display text-sm text-leather mb-1">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-transparent border-b border-leather/40 py-2 outline-none focus:border-seal transition-colors font-body text-lg"
              />
            </div>
          </div>

          {error && (
            <p className="text-seal text-sm mt-4 font-body">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-8 py-3 bg-seal text-parchment font-display tracking-wide hover:bg-seal/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Selando o pacto..." : "Criar conta"}
          </button>

          <p className="text-center text-sm mt-6 text-leather/70 font-body">
            Já tem uma conta?{" "}
            <a href="/login" className="text-moss underline hover:text-seal">
              Entrar
            </a>
          </p>
        </form>
      </div>
    </main>
  )
}