-- Миграция для обновления структуры промокодов
-- Выполните эту миграцию после обновления schema.sql

USE backgammon_cards;

-- Создаем таблицу связи промокодов с карточками
CREATE TABLE IF NOT EXISTS promo_code_cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    promo_code_id INT NOT NULL,
    card_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE CASCADE,
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
    UNIQUE KEY unique_promo_card (promo_code_id, card_id)
);

-- Удаляем поле card_package_size из таблицы promo_codes
ALTER TABLE promo_codes DROP COLUMN IF EXISTS card_package_size;

-- Добавляем несколько тестовых карточек, если их нет
INSERT IGNORE INTO cards (title, description, image_url, correct_moves, position_description, difficulty_level) VALUES
('Позиция 1', 'Базовая позиция для изучения', '/uploads/card1.jpg', 'Ход 1: 24-20, Ход 2: 13-9', 'Белым ход. Нужно найти лучший план игры.', 'easy'),
('Позиция 2', 'Средняя сложность', '/uploads/card2.jpg', 'Ход 1: 8-4, Ход 2: 6-2', 'Черным ход. Критическая позиция в эндшпиле.', 'medium'),
('Позиция 3', 'Сложная позиция', '/uploads/card3.jpg', 'Ход 1: 13-9, Ход 2: 11-7', 'Белым ход. Нужно правильно оценить позицию.', 'hard');

-- Создаем тестовый промокод с карточками
INSERT IGNORE INTO promo_codes (code, description, max_uses, current_uses, is_active) VALUES
('TEST123', 'Тестовый промокод для 3 карточек', 10, 0, 1);

-- Связываем промокод с карточками
INSERT IGNORE INTO promo_code_cards (promo_code_id, card_id) VALUES
(LAST_INSERT_ID(), 1),
(LAST_INSERT_ID(), 2),
(LAST_INSERT_ID(), 3);
