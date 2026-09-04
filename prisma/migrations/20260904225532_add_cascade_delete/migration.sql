-- DropForeignKey
ALTER TABLE "CampaignMember" DROP CONSTRAINT "CampaignMember_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "CampaignMember" DROP CONSTRAINT "CampaignMember_userId_fkey";

-- AddForeignKey
ALTER TABLE "CampaignMember" ADD CONSTRAINT "CampaignMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMember" ADD CONSTRAINT "CampaignMember_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
