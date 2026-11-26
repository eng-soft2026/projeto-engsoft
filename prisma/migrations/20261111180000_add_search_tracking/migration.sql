-- CreateTable
CREATE TABLE `search_history` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `destination` VARCHAR(200) NOT NULL,
    `check_in` DATE NOT NULL,
    `check_out` DATE NOT NULL,
    `guests` SMALLINT UNSIGNED NOT NULL,
    `filters` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `search_history_user_id_created_at_idx`(`user_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `search_impression` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NULL,
    `unit_id` CHAR(36) NOT NULL,
    `search_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `search_impression_unit_id_created_at_idx`(`unit_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `search_click` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NULL,
    `unit_id` CHAR(36) NOT NULL,
    `search_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `search_click_unit_id_created_at_idx`(`unit_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `search_history` ADD CONSTRAINT `search_history_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `search_impression` ADD CONSTRAINT `search_impression_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `search_impression` ADD CONSTRAINT `search_impression_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `hotel_unit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `search_impression` ADD CONSTRAINT `search_impression_search_id_fkey` FOREIGN KEY (`search_id`) REFERENCES `search_history`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `search_click` ADD CONSTRAINT `search_click_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `search_click` ADD CONSTRAINT `search_click_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `hotel_unit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `search_click` ADD CONSTRAINT `search_click_search_id_fkey` FOREIGN KEY (`search_id`) REFERENCES `search_history`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- CHECK constraints (Prisma cannot express them)
ALTER TABLE `search_history` ADD CONSTRAINT `search_history_dates_check` CHECK (`check_in` < `check_out`);
ALTER TABLE `search_history` ADD CONSTRAINT `search_history_guests_check` CHECK (`guests` >= 1);
