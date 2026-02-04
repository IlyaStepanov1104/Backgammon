/**
 * Migration: initial_schema
 * Created at: 2026-02-02
 *
 * This migration creates the initial database schema.
 * All existing tables are included for documentation purposes.
 */

/**
 * Run the migration
 * @param {import('mysql2/promise').Connection} connection
 */
async function up(connection) {
    // Users table
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            telegram_id BIGINT NOT NULL UNIQUE,
            username VARCHAR(255) DEFAULT NULL,
            first_name VARCHAR(255) DEFAULT '',
            last_name VARCHAR(255) DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_telegram_id (telegram_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Cards table
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS cards (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT DEFAULT NULL,
            image_url VARCHAR(500) DEFAULT NULL,
            image_url_2 VARCHAR(500) DEFAULT NULL,
            image_url_3 VARCHAR(500) DEFAULT NULL,
            correct_moves TEXT DEFAULT NULL,
            position_description TEXT DEFAULT NULL,
            difficulty_level ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tags table
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS tags (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Card tags junction table
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS card_tags (
            card_id INT NOT NULL,
            tag_id INT NOT NULL,
            PRIMARY KEY (card_id, tag_id),
            FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Promo codes table
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS promo_codes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            code VARCHAR(20) NOT NULL UNIQUE,
            description TEXT DEFAULT NULL,
            max_uses INT DEFAULT 1,
            current_uses INT DEFAULT 0,
            expires_at TIMESTAMP NULL DEFAULT NULL,
            is_active TINYINT(1) DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_code (code),
            INDEX idx_is_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Promo code cards junction table
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS promo_code_cards (
            promo_code_id INT NOT NULL,
            card_id INT NOT NULL,
            PRIMARY KEY (promo_code_id, card_id),
            FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE CASCADE,
            FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Packages table
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS packages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT DEFAULT NULL,
            price DECIMAL(10, 2) NOT NULL,
            is_active TINYINT(1) DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_is_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Package cards junction table
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS package_cards (
            package_id INT NOT NULL,
            card_id INT NOT NULL,
            PRIMARY KEY (package_id, card_id),
            FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE,
            FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Package purchases table
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS package_purchases (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            package_id INT NOT NULL,
            payment_id VARCHAR(255) DEFAULT NULL,
            amount DECIMAL(10, 2) NOT NULL,
            status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
            purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE,
            INDEX idx_user_id (user_id),
            INDEX idx_payment_id (payment_id),
            INDEX idx_package_id (package_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // User card access table
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS user_card_access (
            user_id INT NOT NULL,
            card_id INT NOT NULL,
            expires_at TIMESTAMP NULL DEFAULT NULL,
            is_active TINYINT(1) DEFAULT 1,
            access_granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, card_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
            INDEX idx_user_id (user_id),
            INDEX idx_is_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // User favorites table
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS user_favorites (
            user_id INT NOT NULL,
            card_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, card_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // User responses table
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS user_responses (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            card_id INT NOT NULL,
            response_status ENUM('correct', 'incorrect') NOT NULL,
            response_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
            INDEX idx_user_card (user_id, card_id),
            INDEX idx_response_time (response_time)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // User groups table
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS user_groups (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            description TEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // User group members junction table
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS user_group_members (
            group_id INT NOT NULL,
            user_id INT NOT NULL,
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (group_id, user_id),
            FOREIGN KEY (group_id) REFERENCES user_groups(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('Initial schema created successfully');
}

/**
 * Reverse the migration
 * @param {import('mysql2/promise').Connection} connection
 */
async function down(connection) {
    // Drop tables in reverse order (respecting foreign key constraints)
    await connection.execute('DROP TABLE IF EXISTS user_group_members');
    await connection.execute('DROP TABLE IF EXISTS user_groups');
    await connection.execute('DROP TABLE IF EXISTS user_responses');
    await connection.execute('DROP TABLE IF EXISTS user_favorites');
    await connection.execute('DROP TABLE IF EXISTS user_card_access');
    await connection.execute('DROP TABLE IF EXISTS package_purchases');
    await connection.execute('DROP TABLE IF EXISTS package_cards');
    await connection.execute('DROP TABLE IF EXISTS packages');
    await connection.execute('DROP TABLE IF EXISTS promo_code_cards');
    await connection.execute('DROP TABLE IF EXISTS promo_codes');
    await connection.execute('DROP TABLE IF EXISTS card_tags');
    await connection.execute('DROP TABLE IF EXISTS tags');
    await connection.execute('DROP TABLE IF EXISTS cards');
    await connection.execute('DROP TABLE IF EXISTS users');

    console.log('Initial schema dropped');
}

module.exports = { up, down };
