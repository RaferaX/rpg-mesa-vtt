import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const { id } = await params
  const userId = (session.user as { id: string }).id

  const token = await prisma.token.findUnique({
    where: { id },
    include: { sheet: { include: { fields: { orderBy: { order: "asc" } } } } },
  })
  if (!token) {
    return NextResponse.json({ error: "Personagem não encontrado" }, { status: 404 })
  }

  const membership = await prisma.campaignMember.findUnique({
    where: { userId_campaignId: { userId, campaignId: token.campaignId } },
  })

  const isOwner = token.ownerId === userId
  const isMaster = membership?.role === "MASTER"

  if (!isOwner && !isMaster) {
    return NextResponse.json({ error: "Você não tem acesso a essa ficha" }, { status: 403 })
  }

  return NextResponse.json({
    token: { id: token.id, name: token.name, color: token.color },
    sheet: token.sheet,
    canEditStructure: isMaster,
  })
}

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

  const token = await prisma.token.findUnique({ where: { id } })
  if (!token) {
    return NextResponse.json({ error: "Personagem não encontrado" }, { status: 404 })
  }

  const membership = await prisma.campaignMember.findUnique({
    where: { userId_campaignId: { userId, campaignId: token.campaignId } },
  })

  if (membership?.role !== "MASTER") {
    return NextResponse.json({ error: "Só o mestre pode criar ou editar a estrutura da ficha" }, { status: 403 })
  }

  const { fields } = await req.json() as { fields: { label: string; value: string }[] }

  const sheet = await prisma.characterSheet.upsert({
    where: { tokenId: id },
    create: {
      tokenId: id,
      fields: {
        create: fields.map((f, i) => ({ label: f.label, value: f.value, order: i })),
      },
    },
    update: {
      fields: {
        deleteMany: {},
        create: fields.map((f, i) => ({ label: f.label, value: f.value, order: i })),
      },
    },
    include: { fields: { orderBy: { order: "asc" } } },
  })

  return NextResponse.json(sheet, { status: 201 })
}