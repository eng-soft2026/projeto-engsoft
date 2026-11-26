-- CreateTable
CREATE TABLE `job_execution` (
    `id` CHAR(36) NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `reference_type` VARCHAR(50) NULL,
    `reference_id` VARCHAR(255) NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'RETRY_SCHEDULED', 'DEAD_LETTERED') NOT NULL DEFAULT 'PENDING',
    `attempts` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    `payload` JSON NOT NULL,
    `last_error` VARCHAR(1000) NULL,
    `correlation_id` VARCHAR(64) NOT NULL,
    `scheduled_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `executed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `job_execution_status_scheduled_at_idx`(`status`, `scheduled_at`),
    INDEX `job_execution_reference_type_reference_id_idx`(`reference_type`, `reference_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CHECK constraints (Prisma cannot express them)
ALTER TABLE `job_execution` ADD CONSTRAINT `job_execution_attempts_check` CHECK (`attempts` BETWEEN 0 AND 3);
ALTER TABLE `job_execution` ADD CONSTRAINT `job_execution_reference_check` CHECK ((`reference_type` IS NULL) = (`reference_id` IS NULL));
ALTER TABLE `job_execution` ADD CONSTRAINT `job_execution_executed_at_check` CHECK (`status` <> 'COMPLETED' OR `executed_at` IS NOT NULL);
