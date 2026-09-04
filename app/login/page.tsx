"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (res?.error) {
      setError("Email ou senha incorretos.")
      return
    }

    router.push("/")
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-[radial-gradient(ellipse_at_center,_#2a2119_0%,_#1B1712_70%)]">
      <div className="w-full max-w-md">
        <h1 className="font-display text-3xl text-center text-brass mb-1 tracking-wide">
          Retorno à Taverna
        </h1>
        <p className="text-center text-parchment/60 text-sm mb-8">
          Entre para continuar sua campanha
        </p>

        <form
          onSubmit={handleSubmit}
          className="bg-parchment text-ink px-8 py-10 border-2 border-leather relative"
          style={{ boxShadow: "0 0 0 1px #1B1712, 0 20px 40px rgba(0,0,0,0.5)" }}
        >
          <div className="space-y-5">
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
            {loading ? "Abrindo o portal..." : "Entrar"}
          </button>

          <p className="text-center text-sm mt-6 text-leather/70 font-body">
            Ainda não tem conta?{" "}
            <a href="/cadastro" className="text-moss underline hover:text-seal">
              Criar conta
            </a>
          </p>
        </form>
      </div>
    </main>
  )
}