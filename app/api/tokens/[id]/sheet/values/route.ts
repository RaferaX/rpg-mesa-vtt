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
    return NextResponse.json({ error: "Personagem não encontrado" }, { status: 404 })
  }

  const membership = await prisma.campaignMember.findUnique({
    where: { userId_campaignId: { userId, campaignId: token.campaignId } },
  })

  const isOwner = token.ownerId === userId
  const isMaster = membership?.role === "MASTER"

  if (!isOwner && !isMaster) {
    return NextResponse.json({ error: "Você não pode editar essa ficha" }, { status: 403 })
  }

  const { values } = await req.json() as { values: { fieldId: string; value: string }[] }

  await Promise.all(
    values.map((v) =>
      prisma.characterField.update({
        where: { id: v.fieldId },
        data: { value: v.value },
      })
    )
  )

  return NextResponse.json({ success: true })
}