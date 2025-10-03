-- AlterTable
ALTER TABLE "storyline" ADD COLUMN     "assigned_to" INTEGER;

-- AddForeignKey
ALTER TABLE "storyline" ADD CONSTRAINT "storyline_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
