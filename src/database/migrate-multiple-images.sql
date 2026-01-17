-- Миграция для добавления дополнительных изображений к карточкам
ALTER TABLE cards ADD COLUMN image_url_2 VARCHAR(500) NULL;
ALTER TABLE cards ADD COLUMN image_url_3 VARCHAR(500) NULL;