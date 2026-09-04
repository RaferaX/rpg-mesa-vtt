import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const { inviteCode } = await req.json()
  const userId = (session.user as { id: string }).id

  const campaign = await prisma.campaign.findUnique({
    where: { inviteCode: inviteCode?.toUpperCase() },
  })

  if (!campaign) {
    return NextResponse.json({ error: "Código de convite inválido" }, { status: 404 })
  }

  const existing = await prisma.campaignMember.findUnique({
    where: { userId_campaignId: { userId, campaignId: campaign.id } },
  })

  if (existing) {
    return NextResponse.json({ error: "Você já está nessa mesa" }, { status: 400 })
  }

  await prisma.campaignMember.create({
    data: { userId, campaignId: campaign.id, role: "PLAYER" },
  })

  return NextResponse.json(campaign, { status: 201 })
}