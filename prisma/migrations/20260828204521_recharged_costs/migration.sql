-- AlterTable
ALTER TABLE `Expense` ADD COLUMN `rechargedOnInvoiceId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_rechargedOnInvoiceId_fkey` FOREIGN KEY (`rechargedOnInvoiceId`) REFERENCES `Invoice`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
