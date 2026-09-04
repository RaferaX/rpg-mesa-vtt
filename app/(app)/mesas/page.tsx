"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

type Campaign = {
  id: string
  name: string
  inviteCode: string
  members: { role: string; user: { name: string } }[]
}

export default function Mesas() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [newName, setNewName] = useState("")
  const [joinCode, setJoinCode] = useState("")
  const [error, setError] = useState("")

  async function loadCampaigns() {
    const res = await fetch("/api/campaigns")
    if (res.status === 401) {
      router.push("/login")
      return
    }
    const data = await res.json()
    setCampaigns(data)
  }

  useEffect(() => {
    loadCampaigns()
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error)
      return
    }
    setNewName("")
    loadCampaigns()
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    const res = await fetch("/api/campaigns/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: joinCode }),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error)
      return
    }
    setJoinCode("")
    loadCampaigns()
  }

  return (
    <main className="px-8 py-12 max-w-3xl">
      <h1 className="font-display text-3xl text-brass mb-8 tracking-wide">
        Minhas Mesas
      </h1>

      <div className="grid md:grid-cols-2 gap-6 mb-12">
        <form
          onSubmit={handleCreate}
          className="bg-parchment text-ink p-6 border-2 border-leather"
        >
          <h2 className="font-display text-lg text-leather mb-3">Criar nova mesa</h2>
          <input
            type="text"
            placeholder="Nome da mesa"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            className="w-full bg-transparent border-b border-leather/40 py-2 outline-none focus:border-seal mb-4"
          />
          <button
            type="submit"
            className="w-full py-2 bg-seal text-parchment font-display hover:bg-seal/90 transition-colors"
          >
            Fundar mesa
          </button>
        </form>

        <form
          onSubmit={handleJoin}
          className="bg-parchment text-ink p-6 border-2 border-leather"
        >
          <h2 className="font-display text-lg text-leather mb-3">Entrar com código</h2>
          <input
            type="text"
            placeholder="Código de convite"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            required
            className="w-full bg-transparent border-b border-leather/40 py-2 outline-none focus:border-seal mb-4 uppercase"
          />
          <button
            type="submit"
            className="w-full py-2 bg-moss text-parchment font-display hover:bg-moss/90 transition-colors"
          >
            Entrar na mesa
          </button>
        </form>
      </div>

      {error && <p className="text-seal mb-6">{error}</p>}

      <div className="space-y-3">
        {campaigns.map((c) => (
          <div
            key={c.id}
            className="bg-parchment text-ink p-4 border-2 border-leather flex justify-between items-center"
          >
            <div>
              <p className="font-display text-lg">{c.name}</p>
              <p className="text-sm text-leather/70">
                {c.members.length} membro{c.members.length !== 1 ? "s" : ""} · Código: {c.inviteCode}
              </p>
            </div>
          </div>
        ))}
        {campaigns.length === 0 && (
          <p className="text-parchment/50 text-center py-8">
            Nenhuma mesa ainda. Funde a primeira ou entre com um código.
          </p>
        )}
      </div>
    </main>
  )
}