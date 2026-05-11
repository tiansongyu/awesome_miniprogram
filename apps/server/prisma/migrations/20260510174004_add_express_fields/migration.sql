-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "image" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "expressCompany" TEXT,
ADD COLUMN     "expressNo" TEXT;
