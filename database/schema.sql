-- LefimovArt Complete Database Schema
-- Clean schema for fresh database installation
-- Compatible with MySQL 5.7+ and MariaDB

-- ============================================================================
-- TABLE: users
-- Purpose: User authentication and profile management
-- ============================================================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NULL,
    google_id VARCHAR(255) NULL UNIQUE,
    verification_code VARCHAR(6) NULL,
    is_verified TINYINT(1) DEFAULT 0,
    credits INT DEFAULT 40,
    name VARCHAR(255) NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_google_id (google_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: generated_images
-- Purpose: Store all AI-generated images
-- ============================================================================
CREATE TABLE generated_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    image_url VARCHAR(512) NOT NULL,
    prompt TEXT NOT NULL,
    resolution VARCHAR(20) NOT NULL DEFAULT '1024',
    ip_address VARCHAR(45) NULL,
    flagged TINYINT(1) DEFAULT 0,
    flagged_reason TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_user_email (user_email),
    INDEX idx_created (created_at),
    INDEX idx_resolution (resolution)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: videos
-- Purpose: Store all AI-generated videos
-- ============================================================================
CREATE TABLE videos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    prompt TEXT NOT NULL,
    image_path VARCHAR(255) NULL,
    model_used VARCHAR(50) NOT NULL,
    resolution VARCHAR(20) NOT NULL DEFAULT '720p',
    duration INT NOT NULL,
    format VARCHAR(20) NOT NULL DEFAULT 'mp4',
    video_url VARCHAR(512) NULL,
    thumbnail_url VARCHAR(512) NULL,
    credits_deducted INT NOT NULL,
    status VARCHAR(20) DEFAULT 'processing',
    queue_id VARCHAR(255) NULL UNIQUE,
    status_url VARCHAR(512) NULL,
    response_url VARCHAR(512) NULL,
    api_endpoint VARCHAR(512) NULL,
    error_message TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_user_email (user_email),
    INDEX idx_status (status),
    INDEX idx_model (model_used),
    INDEX idx_created (created_at),
    INDEX idx_queue_id (queue_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: processed_payments
-- Purpose: Track Stripe payments to prevent duplicate charges
-- ============================================================================
CREATE TABLE processed_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    plan VARCHAR(50) NOT NULL,
    credits_added INT NOT NULL,
    amount_usd DECIMAL(10, 2) NOT NULL,
    stripe_customer_id VARCHAR(255) NULL,
    stripe_payment_intent_id VARCHAR(255) NULL,
    status VARCHAR(20) DEFAULT 'completed',
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE,
    INDEX idx_session_id (session_id),
    INDEX idx_user_id (user_id),
    INDEX idx_user_email (user_email),
    INDEX idx_processed (processed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: password_resets
-- Purpose: Manage password reset tokens
-- ============================================================================
CREATE TABLE password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(64) UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_email (email),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: auth_tokens
-- Purpose: Manage JWT tokens for logout and token blacklisting
-- ============================================================================
CREATE TABLE auth_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(512) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user_id (user_id),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: audit_logs
-- Purpose: Track important user actions for security and debugging
-- ============================================================================
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    user_email VARCHAR(255) NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NULL,
    resource_id INT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    details JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- INITIAL DATA (OPTIONAL)
-- ============================================================================

-- Create default admin user (password: admin123 - CHANGE THIS!)
-- Email: admin@lefimovart.local
-- Password Hash generated with: password_hash('admin123', PASSWORD_BCRYPT)
INSERT IGNORE INTO users (email, password_hash, name, is_verified, credits, role) 
VALUES ('admin@lefimovart.local', '$2y$10$example_hash_here', 'Admin User', 1, 1000, 'admin');

-- ============================================================================
-- NOTES FOR DEPLOYMENT
-- ============================================================================
-- 1. Run this script to create all tables from scratch
-- 2. Change the default admin password immediately after setup
-- 3. Configure email SMTP settings in .env
-- 4. Set up Google OAuth credentials in .env
-- 5. Configure Stripe API keys in .env
-- 6. Ensure database user has appropriate permissions:
--    GRANT ALL PRIVILEGES ON database_name.* TO 'user'@'localhost';
