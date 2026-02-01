'use client';

import { useState, useEffect } from 'react';
import CardSelector from './CardSelector';

/**
 * Компонент для выбора карточек с поддержкой ввода диапазона ID
 * @param {Array} selectedCardIds - Массив выбранных ID карточек
 * @param {Function} onSelectionChange - Callback при изменении выбора
 * @param {string} label - Метка для поля
 * @param {boolean} required - Обязательное ли поле
 */
export default function CardSelectorWithRange({ 
  selectedCardIds = [], 
  onSelectionChange, 
  label = 'Выбрать карточки',
  required = false 
}) {
  const [cardRangeInput, setCardRangeInput] = useState('');
  const [showCardSelector, setShowCardSelector] = useState(false);
  const [cardsFromSelector, setCardsFromSelector] = useState([]);

  // Инициализируем cardsFromSelector из selectedCardIds при монтировании
  useEffect(() => {
    // При первом рендере, если есть выбранные карточки, предполагаем, что они из селектора
    // Это нужно для правильной инициализации при редактировании
    if (selectedCardIds.length > 0 && cardsFromSelector.length === 0) {
      setCardsFromSelector(selectedCardIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Функция парсинга диапазона ID карточек
  // Поддерживает форматы: "1-10", "1,2,3", "1,2,5-10", "1-5,10,15-20"
  const parseCardRange = (input) => {
    if (!input || !input.trim()) {
      return [];
    }

    const ids = new Set();
    const parts = input.split(',').map(part => part.trim()).filter(part => part);

    for (const part of parts) {
      if (part.includes('-')) {
        // Диапазон вида "1-10"
        const [start, end] = part.split('-').map(s => parseInt(s.trim()));
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          for (let i = start; i <= end; i++) {
            ids.add(i);
          }
        }
      } else {
        // Одиночное число
        const num = parseInt(part);
        if (!isNaN(num) && num > 0) {
          ids.add(num);
        }
      }
    }

    return Array.from(ids).sort((a, b) => a - b);
  };

  // Обработка изменения диапазона карточек
  const handleCardRangeChange = (input) => {
    setCardRangeInput(input);
    const rangeIds = parseCardRange(input);
    
    // Объединяем ID из диапазона с карточками из селектора
    const allIds = new Set([...cardsFromSelector, ...rangeIds]);
    const sortedIds = Array.from(allIds).sort((a, b) => a - b);
    onSelectionChange(sortedIds);
  };

  // Обработка выбора карточек через селектор
  const handleCardSelection = (selectedCardIds) => {
    // Сохраняем карточки из селектора
    setCardsFromSelector(selectedCardIds);
    
    // Объединяем выбранные карточки с карточками из диапазона
    const rangeIds = parseCardRange(cardRangeInput);
    const allIds = new Set([...selectedCardIds, ...rangeIds]);
    const sortedIds = Array.from(allIds).sort((a, b) => a - b);
    onSelectionChange(sortedIds);
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-2">
        {label} {required && '*'}
      </label>
      <div className="space-y-2">
        <div>
          <label className="block text-xs text-gray-600 mb-1">
            Введите диапазон ID (например: 1-10, 15, 20-25)
          </label>
          <input
            type="text"
            value={cardRangeInput}
            onChange={(e) => handleCardRangeChange(e.target.value)}
            placeholder="1-10, 15, 20-25"
            className="w-full px-3 py-2 border rounded-md text-sm"
          />
          {cardRangeInput && (
            <p className="text-xs text-gray-500 mt-1">
              Будет добавлено: {parseCardRange(cardRangeInput).join(', ')}
            </p>
          )}
        </div>
        <div className="text-center text-gray-400 text-sm">или</div>
        <button
          type="button"
          onClick={() => setShowCardSelector(true)}
          className="w-full px-3 py-2 border rounded-md text-left hover:border-blue-500"
        >
          {selectedCardIds.length > 0 
            ? `${selectedCardIds.length} карточек выбрано` 
            : 'Нажмите для выбора карточек'}
        </button>
        {selectedCardIds.length > 0 && (
          <div className="text-xs text-gray-600 mt-1">
            Выбранные ID: {selectedCardIds.slice(0, 20).join(', ')}
            {selectedCardIds.length > 20 && ` ... и еще ${selectedCardIds.length - 20}`}
          </div>
        )}
      </div>

      {showCardSelector && (
        <CardSelector
          selectedCardIds={cardsFromSelector}
          onSelectionChange={handleCardSelection}
          onClose={() => setShowCardSelector(false)}
        />
      )}
    </div>
  );
}

