import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const { id } = await params
  const userId = (session.user as { id: string }).id

  const membership = await prisma.campaignMember.findUnique({
    where: { userId_campaignId: { userId, campaignId: id } },
  })

  if (membership?.role !== "MASTER") {
    return NextResponse.json({ error: "Só o mestre pode trocar o mapa" }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get("file") as File | null

  if (!file) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const ext = file.name.split(".").pop()
  const fileName = `${id}-${Date.now()}.${ext}`
  const uploadDir = path.join(process.cwd(), "public", "uploads")

  await mkdir(uploadDir, { recursive: true })
  await writeFile(path.join(uploadDir, fileName), buffer)

  const url = `/uploads/${fileName}`

  const campaign = await prisma.campaign.update({
    where: { id },
    data: { backgroundUrl: url },
  })

  return NextResponse.json(campaign)
}