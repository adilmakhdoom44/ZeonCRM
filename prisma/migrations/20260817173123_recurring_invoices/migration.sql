-- AlterTable
ALTER TABLE `Invoice` ADD COLUMN `recurringInvoiceId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `RecurringInvoice` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `taxRate` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `terms` TEXT NULL,
    `cadence` ENUM('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY') NOT NULL DEFAULT 'MONTHLY',
    `dueInDays` INTEGER NOT NULL DEFAULT 30,
    `nextRunOn` DATETIME(3) NOT NULL,
    `lastRunOn` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RecurringInvoice_customerId_idx`(`customerId`),
    INDEX `RecurringInvoice_isActive_nextRunOn_idx`(`isActive`, `nextRunOn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RecurringInvoiceItem` (
    `id` VARCHAR(191) NOT NULL,
    `recurringInvoiceId` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(10, 2) NOT NULL DEFAULT 1,
    `unitPrice` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `position` INTEGER NOT NULL DEFAULT 0,

    INDEX `RecurringInvoiceItem_recurringInvoiceId_idx`(`recurringInvoiceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RecurringInvoice` ADD CONSTRAINT `RecurringInvoice_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecurringInvoiceItem` ADD CONSTRAINT `RecurringInvoiceItem_recurringInvoiceId_fkey` FOREIGN KEY (`recurringInvoiceId`) REFERENCES `RecurringInvoice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_recurringInvoiceId_fkey` FOREIGN KEY (`recurringInvoiceId`) REFERENCES `RecurringInvoice`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
