"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { io, Socket } from "socket.io-client"

export default function Mesa() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const campaignId = params.id as string
  const userName = session?.user?.name

  const [status, setStatus] = useState("Conectando...")
  const [eventos, setEventos] = useState<string[]>([])
  const entrouRef = useRef(false)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!userName) return

    const socket: Socket = io("http://localhost:4000")
    socketRef.current = socket

    socket.on("connect", () => {
      setStatus("Conectado")
      socket.emit("entrarMesa", { campaignId, userName })
      entrouRef.current = true
    })

    socket.on("jogadorEntrou", (data: { userName: string }) => {
      setEventos((prev) => [...prev, `${data.userName} entrou na mesa`])
    })

    socket.on("jogadorSaiu", (data: { userName: string }) => {
      setEventos((prev) => [...prev, `${data.userName} saiu da mesa`])
    })

    socket.on("disconnect", () => {
      setStatus("Desconectado")
    })

    return () => {
      if (entrouRef.current) {
        socket.emit("sairMesa", campaignId)
      }
      socket.disconnect()
      entrouRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, userName])

  function handleSair() {
    router.push("/mesas")
  }

  return (
    <main className="px-8 py-12 max-w-3xl">
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
      <p className="text-parchment/60 mb-8">Status: {status}</p>

      <div className="bg-parchment text-ink p-6 border-2 border-leather">
        <h2 className="font-display text-lg text-leather mb-3">Eventos da sala</h2>
        {eventos.length === 0 ? (
          <p className="text-leather/60">Nenhum evento ainda.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {eventos.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}