-- AlterTable
ALTER TABLE "storyline_progress" ADD COLUMN     "student_id" INTEGER;

-- AddForeignKey
ALTER TABLE "storyline_progress" ADD CONSTRAINT "storyline_progress_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
