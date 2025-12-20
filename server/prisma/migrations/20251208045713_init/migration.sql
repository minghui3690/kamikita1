-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
    `referralCode` VARCHAR(191) NOT NULL,
    `uplineId` VARCHAR(191) NULL,
    `walletBalance` DOUBLE NOT NULL DEFAULT 0,
    `totalEarnings` DOUBLE NOT NULL DEFAULT 0,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isKakaUnlocked` BOOLEAN NOT NULL DEFAULT false,
    `kyc` JSON NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_referralCode_key`(`referralCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `price` DOUBLE NOT NULL,
    `points` DOUBLE NOT NULL,
    `description` TEXT NOT NULL,
    `image` VARCHAR(191) NULL,
    `pdfUrl` VARCHAR(191) NULL,
    `customRedirectUrl` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Transaction` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `items` JSON NOT NULL,
    `subtotal` DOUBLE NOT NULL,
    `taxAmount` DOUBLE NOT NULL,
    `discountAmount` DOUBLE NOT NULL,
    `pointsRedeemed` DOUBLE NOT NULL,
    `pointsRedeemedValue` DOUBLE NOT NULL,
    `totalAmount` DOUBLE NOT NULL,
    `totalPointsEarned` DOUBLE NOT NULL,
    `status` ENUM('PENDING', 'PAID', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `paymentMethod` ENUM('BANK_TRANSFER', 'GATEWAY', 'POINT_CUT') NOT NULL,
    `paymentProof` VARCHAR(191) NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `commissionsDistributed` BOOLEAN NOT NULL DEFAULT false,
    `voucherCode` VARCHAR(191) NULL,
    `isArchived` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommissionLog` (
    `id` VARCHAR(191) NOT NULL,
    `transactionId` VARCHAR(191) NOT NULL,
    `beneficiaryId` VARCHAR(191) NOT NULL,
    `sourceUserId` VARCHAR(191) NOT NULL,
    `level` INTEGER NOT NULL,
    `amount` DOUBLE NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WithdrawalRequest` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `userName` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `bankDetails` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `requestDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processDate` DATETIME(3) NULL,
    `adminProofImage` VARCHAR(191) NULL,
    `adminProofLink` VARCHAR(191) NULL,
    `rejectionReason` VARCHAR(191) NULL,
    `isArchived` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Announcement` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `content` TEXT NOT NULL,
    `image` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Voucher` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `discountPercent` DOUBLE NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Voucher_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KakaItem` (
    `id` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `description` VARCHAR(191) NOT NULL,
    `mediaType` VARCHAR(191) NOT NULL,
    `mediaUrl` VARCHAR(191) NULL,
    `mediaName` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HumanDesignProfile` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `chartImage` VARCHAR(191) NULL,
    `chartName` VARCHAR(191) NULL,
    `chartBirthDate` VARCHAR(191) NULL,
    `chartBirthTime` VARCHAR(191) NULL,
    `chartBirthCity` VARCHAR(191) NULL,
    `type` VARCHAR(191) NULL,
    `profile` VARCHAR(191) NULL,
    `authority` VARCHAR(191) NULL,
    `strategy` VARCHAR(191) NULL,
    `definition` VARCHAR(191) NULL,
    `signature` VARCHAR(191) NULL,
    `notSelfTheme` VARCHAR(191) NULL,
    `incarnationCross` VARCHAR(191) NULL,
    `digestion` VARCHAR(191) NULL,
    `sense` VARCHAR(191) NULL,
    `motivation` VARCHAR(191) NULL,
    `perspective` VARCHAR(191) NULL,
    `environment` VARCHAR(191) NULL,
    `design` JSON NULL,
    `personality` JSON NULL,
    `centers` JSON NULL,
    `channels` JSON NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `HumanDesignProfile_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SystemSettings` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'settings',
    `commissionLevels` INTEGER NOT NULL DEFAULT 3,
    `levelPercentages` JSON NOT NULL,
    `pointRate` DOUBLE NOT NULL DEFAULT 1000,
    `taxPercentage` DOUBLE NOT NULL DEFAULT 11,
    `branding` JSON NOT NULL,
    `productPage` JSON NOT NULL,
    `landingPage` JSON NOT NULL,
    `paymentConfig` JSON NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_uplineId_fkey` FOREIGN KEY (`uplineId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommissionLog` ADD CONSTRAINT `CommissionLog_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `Transaction`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommissionLog` ADD CONSTRAINT `CommissionLog_beneficiaryId_fkey` FOREIGN KEY (`beneficiaryId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WithdrawalRequest` ADD CONSTRAINT `WithdrawalRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HumanDesignProfile` ADD CONSTRAINT `HumanDesignProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
