/*
  Warnings:

  - You are about to drop the column `status` on the `Project` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Project` DROP COLUMN `status`,
    ADD COLUMN `completedAt` DATETIME(3) NULL,
    ADD COLUMN `price` DECIMAL(12, 2) NULL,
    ADD COLUMN `stage` ENUM('QUOTED', 'CONFIRMED', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'QUOTED';

-- CreateTable
CREATE TABLE `ProjectTask` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `isDone` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProjectTask_projectId_idx`(`projectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Project_stage_idx` ON `Project`(`stage`);

-- AddForeignKey
ALTER TABLE `ProjectTask` ADD CONSTRAINT `ProjectTask_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
