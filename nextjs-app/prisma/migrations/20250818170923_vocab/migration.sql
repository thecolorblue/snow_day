-- CreateTable
CREATE TABLE "vocab" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "list" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vocab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_vocab" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "vocab_id" INTEGER NOT NULL,

    CONSTRAINT "student_vocab_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "student_vocab" ADD CONSTRAINT "student_vocab_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_vocab" ADD CONSTRAINT "student_vocab_vocab_id_fkey" FOREIGN KEY ("vocab_id") REFERENCES "vocab"("id") ON DELETE CASCADE ON UPDATE CASCADE;
