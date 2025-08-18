/*
  Warnings:

  - You are about to drop the column `genre` on the `student` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `student` table. All the data in the column will be lost.
  - You are about to drop the column `style` on the `student` table. All the data in the column will be lost.
  - Added the required column `name` to the `student` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "student" DROP COLUMN "genre",
DROP COLUMN "location",
DROP COLUMN "style",
ADD COLUMN     "guardian_id" INTEGER,
ADD COLUMN     "name" TEXT NOT NULL,
ALTER COLUMN "interests" SET NOT NULL,
ALTER COLUMN "interests" SET DATA TYPE TEXT,
ALTER COLUMN "friends" SET NOT NULL,
ALTER COLUMN "friends" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "guardian" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guardian_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "guardian_email_key" ON "guardian"("email");

-- AddForeignKey
ALTER TABLE "student" ADD CONSTRAINT "student_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "guardian"("id") ON DELETE SET NULL ON UPDATE CASCADE;
