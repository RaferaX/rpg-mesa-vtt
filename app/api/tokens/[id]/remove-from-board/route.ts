import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(
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
    return NextResponse.json({ error: "Token não encontrado" }, { status: 404 })
  }

  const membership = await prisma.campaignMember.findUnique({
    where: { userId_campaignId: { userId, campaignId: token.campaignId } },
  })

  const isOwner = token.ownerId === userId
  const isMaster = membership?.role === "MASTER"

  if (!isOwner && !isMaster) {
    return NextResponse.json({ error: "Você não pode remover este token" }, { status: 403 })
  }

  const updated = await prisma.token.update({
    where: { id },
    data: { onBoard: false },
  })

  return NextResponse.json(updated)
}