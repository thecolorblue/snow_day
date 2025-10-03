-- AlterTable
ALTER TABLE "vocab" ADD COLUMN     "guardian_id" INTEGER;

-- AddForeignKey
ALTER TABLE "vocab" ADD CONSTRAINT "vocab_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "guardian"("id") ON DELETE SET NULL ON UPDATE CASCADE;
