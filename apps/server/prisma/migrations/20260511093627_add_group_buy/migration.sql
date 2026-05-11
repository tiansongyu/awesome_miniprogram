-- CreateEnum
CREATE TYPE "GroupBuyStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'GROUPING';

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "salesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "warehouse" TEXT;

-- CreateTable
CREATE TABLE "group_buy_activities" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "groupPrice" DECIMAL(10,2) NOT NULL,
    "groupSize" INTEGER NOT NULL DEFAULT 2,
    "duration" INTEGER NOT NULL DEFAULT 24,
    "maxGroups" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_buy_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_buy_groups" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "leaderId" TEXT NOT NULL,
    "status" "GroupBuyStatus" NOT NULL DEFAULT 'PENDING',
    "expireAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_buy_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_buy_members" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_buy_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "group_buy_members_orderId_key" ON "group_buy_members"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "group_buy_members_groupId_userId_key" ON "group_buy_members"("groupId", "userId");

-- AddForeignKey
ALTER TABLE "group_buy_activities" ADD CONSTRAINT "group_buy_activities_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_buy_activities" ADD CONSTRAINT "group_buy_activities_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_buy_groups" ADD CONSTRAINT "group_buy_groups_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "group_buy_activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_buy_groups" ADD CONSTRAINT "group_buy_groups_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_buy_members" ADD CONSTRAINT "group_buy_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group_buy_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_buy_members" ADD CONSTRAINT "group_buy_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_buy_members" ADD CONSTRAINT "group_buy_members_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
