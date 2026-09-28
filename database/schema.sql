-- =====================================================================
-- Secure Student Grievance & Feedback Portal
-- Database Schema for MySQL 8.0+
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `grievance_portal`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `grievance_portal`;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `role` ENUM('student', 'admin') NOT NULL DEFAULT 'student',
  `name` VARCHAR(100) NOT NULL,
  `register_no` VARCHAR(50) NOT NULL UNIQUE,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `department` VARCHAR(100) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `failed_attempts` INT NOT NULL DEFAULT 0,
  `locked_until` DATETIME NULL DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_register_no` (`register_no`),
  INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tickets Table
CREATE TABLE IF NOT EXISTS `tickets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ticket_code` VARCHAR(50) NOT NULL UNIQUE,
  `user_id` INT NOT NULL,
  `type` ENUM('grievance', 'feedback') NOT NULL DEFAULT 'grievance',
  `category` ENUM('academic', 'hostel', 'infrastructure', 'canteen', 'examination', 'library', 'transportation', 'other') NOT NULL,
  `subject` VARCHAR(200) NOT NULL,
  `description` TEXT NOT NULL,
  `priority` ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
  `status` ENUM('pending', 'in_review', 'resolved') NOT NULL DEFAULT 'pending',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_tickets_user_id` (`user_id`),
  INDEX `idx_tickets_status` (`status`),
  INDEX `idx_tickets_category` (`category`),
  INDEX `idx_tickets_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Ticket Responses Table
CREATE TABLE IF NOT EXISTS `responses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ticket_id` INT NOT NULL,
  `admin_id` INT NOT NULL,
  `message` TEXT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`admin_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_responses_ticket_id` (`ticket_id`),
  INDEX `idx_responses_admin_id` (`admin_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Security Audit Logs Table
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL DEFAULT NULL,
  `action` VARCHAR(100) NOT NULL,
  `ip` VARCHAR(45) NOT NULL,
  `user_agent` VARCHAR(255) NULL DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_audit_logs_user_id` (`user_id`),
  INDEX `idx_audit_logs_action` (`action`),
  INDEX `idx_audit_logs_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Sessions Table (for express-mysql-session)
CREATE TABLE IF NOT EXISTS `sessions` (
  `session_id` VARCHAR(128) COLLATE utf8mb4_bin NOT NULL PRIMARY KEY,
  `expires` INT(11) UNSIGNED NOT NULL,
  `data` MEDIUMTEXT COLLATE utf8mb4_bin,
  INDEX `idx_sessions_expires` (`expires`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
