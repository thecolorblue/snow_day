-- CreateEnum
CREATE TYPE "taskstatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "story" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "audio" TEXT,

    CONSTRAINT "story_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "correct" TEXT NOT NULL,
    "answers" TEXT,
    "classroom" TEXT NOT NULL,

    CONSTRAINT "question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_question" (
    "id" SERIAL NOT NULL,
    "story_id" INTEGER NOT NULL,
    "question_id" INTEGER NOT NULL,

    CONSTRAINT "story_question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storyline" (
    "storyline_id" SERIAL NOT NULL,
    "original_request" TEXT,
    "status" VARCHAR NOT NULL,

    CONSTRAINT "storyline_pkey" PRIMARY KEY ("storyline_id")
);

-- CreateTable
CREATE TABLE "storyline_step" (
    "storyline_step_id" SERIAL NOT NULL,
    "storyline_id" INTEGER NOT NULL,
    "step" INTEGER NOT NULL,
    "story_id" INTEGER NOT NULL,

    CONSTRAINT "storyline_step_pkey" PRIMARY KEY ("storyline_step_id")
);

-- CreateTable
CREATE TABLE "storyline_progress" (
    "storyline_progress_id" SERIAL NOT NULL,
    "story_question_id" INTEGER NOT NULL,
    "duration" INTEGER,
    "score" INTEGER,
    "attempts" INTEGER,
    "created_at" TIMESTAMP(6),
    "storyline_id" INTEGER NOT NULL,
    "storyline_step_id" INTEGER NOT NULL,

    CONSTRAINT "storyline_progress_pkey" PRIMARY KEY ("storyline_progress_id")
);

-- CreateTable
CREATE TABLE "task_queue" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "status" "taskstatus" NOT NULL,
    "context" JSON,
    "priority" INTEGER,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "task_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alembic_version" (
    "version_num" VARCHAR(32) NOT NULL,

    CONSTRAINT "alembic_version_pkc" PRIMARY KEY ("version_num")
);

-- CreateTable
CREATE TABLE "document" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "contentType" TEXT,
    "contentDisposition" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student" (
    "id" SERIAL NOT NULL,
    "genre" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "style" TEXT NOT NULL,
    "interests" TEXT[],
    "friends" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_url_key" ON "document"("url");

-- CreateIndex
CREATE UNIQUE INDEX "document_pathname_key" ON "document"("pathname");

-- AddForeignKey
ALTER TABLE "story_question" ADD CONSTRAINT "story_question_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "question"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "story_question" ADD CONSTRAINT "story_question_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "story"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "storyline_step" ADD CONSTRAINT "storyline_step_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "story"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "storyline_step" ADD CONSTRAINT "storyline_step_storyline_id_fkey" FOREIGN KEY ("storyline_id") REFERENCES "storyline"("storyline_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "storyline_progress" ADD CONSTRAINT "storyline_progress_story_question_id_fkey" FOREIGN KEY ("story_question_id") REFERENCES "story_question"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "storyline_progress" ADD CONSTRAINT "storyline_progress_storyline_id_fkey" FOREIGN KEY ("storyline_id") REFERENCES "storyline"("storyline_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "storyline_progress" ADD CONSTRAINT "storyline_progress_storyline_step_id_fkey" FOREIGN KEY ("storyline_step_id") REFERENCES "storyline_step"("storyline_step_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
