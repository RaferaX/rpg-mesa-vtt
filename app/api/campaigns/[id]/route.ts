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

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      members: { include: { user: true } },
    },
  })
  if (!campaign) {
    return NextResponse.json({ error: "Mesa não encontrada" }, { status: 404 })
  }

  const membership = await prisma.campaignMember.findUnique({
    where: { userId_campaignId: { userId, campaignId: id } },
  })

  return NextResponse.json({
    ...campaign,
    myRole: membership?.role ?? "PLAYER",
    myUserId: userId,
  })
}