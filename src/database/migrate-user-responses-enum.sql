-- Миграция: Изменение поля is_correct в таблице user_responses с BOOLEAN на ENUM
ALTER TABLE user_responses ADD COLUMN response_status ENUM('not_selected', 'correct', 'incorrect') NOT NULL DEFAULT 'not_selected';

-- Перенос существующих данных
UPDATE user_responses SET response_status = CASE WHEN is_correct = 1 THEN 'correct' WHEN is_correct = 0 THEN 'incorrect' ELSE 'not_selected' END;

-- Удаление старого поля и переименование нового
ALTER TABLE user_responses DROP COLUMN is_correct;
ALTER TABLE user_responses CHANGE COLUMN response_status is_correct ENUM('not_selected', 'correct', 'incorrect') NOT NULL DEFAULT 'not_selected';