/*
  Warnings:

  - A unique constraint covering the columns `[shareToken]` on the table `Proposal` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `Proposal` ADD COLUMN `declineNote` TEXT NULL,
    ADD COLUMN `respondedAt` DATETIME(3) NULL,
    ADD COLUMN `respondedByName` VARCHAR(191) NULL,
    ADD COLUMN `sentAt` DATETIME(3) NULL,
    ADD COLUMN `shareToken` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Proposal_shareToken_key` ON `Proposal`(`shareToken`);
