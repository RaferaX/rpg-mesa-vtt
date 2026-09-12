"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { io, Socket } from "socket.io-client"
import { Board } from "@/components/Board"
import { Chat } from "@/components/Chat"
import { CharacterPanel } from "@/components/CharacterPanel"

export default function Mesa() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const campaignId = params.id as string
  const userName = session?.user?.name

  const [status, setStatus] = useState("Conectando...")
  const [eventos, setEventos] = useState<string[]>([])
  const [socket, setSocket] = useState<Socket | null>(null)
  const entrouRef = useRef(false)

  const [myRole, setMyRole] = useState<"MASTER" | "PLAYER" | null>(null)
  const [myUserId, setMyUserId] = useState<string | null>(null)

  useEffect(() => {
    async function loadRole() {
      const res = await fetch(`/api/campaigns/${campaignId}`)
      const data = await res.json()
      setMyRole(data.myRole)
      setMyUserId(data.myUserId)
    }
    loadRole()
  }, [campaignId])

  useEffect(() => {
    if (!userName) return

    const s: Socket = io("http://localhost:4000")

    s.on("connect", () => {
      setStatus("Conectado")
      s.emit("entrarMesa", { campaignId, userName })
      entrouRef.current = true
    })

    s.on("jogadorEntrou", (data: { userName: string }) => {
      setEventos((prev) => [...prev, `${data.userName} entrou na mesa`])
    })

    s.on("jogadorSaiu", (data: { userName: string }) => {
      setEventos((prev) => [...prev, `${data.userName} saiu da mesa`])
    })

    s.on("disconnect", () => {
      setStatus("Desconectado")
    })

    setSocket(s)

    return () => {
      if (entrouRef.current) {
        s.emit("sairMesa", campaignId)
      }
      s.disconnect()
      entrouRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, userName])

  function handleSair() {
    router.push("/mesas")
  }

  return (
    <main className="px-8 py-12">
      <div className="flex justify-between items-center mb-2">
        <h1 className="font-display text-3xl text-brass tracking-wide">
          Mesa
        </h1>
        <button
          onClick={handleSair}
          className="px-4 py-2 bg-leather/40 text-parchment font-display text-sm tracking-wide hover:bg-leather/60 transition-colors"
        >
          Sair da mesa
        </button>
      </div>
      <p className="text-parchment/60 mb-6">Status: {status}</p>

      {socket && userName && myRole && myUserId && (
        <Board
          campaignId={campaignId}
          socket={socket}
          userName={userName}
          myUserId={myUserId}
          myRole={myRole}
        />
      )}

      {socket && userName && (
        <div className="flex gap-6 mt-6 items-start">
          <div className="flex-1 max-w-3xl">
            <Chat campaignId={campaignId} socket={socket} userName={userName} />
          </div>
          <div className="w-72 shrink-0">
            {myRole && myUserId && (
  <CharacterPanel campaignId={campaignId} socket={socket} myRole={myRole} myUserId={myUserId} />
)}
          </div>
        </div>
      )}

      {eventos.length > 0 && (
        <div className="bg-parchment text-ink p-6 border-2 border-leather mt-6 max-w-3xl">
          <h2 className="font-display text-lg text-leather mb-3">Eventos da sala</h2>
          <ul className="space-y-1 text-sm">
            {eventos.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
    </main>
  )
}