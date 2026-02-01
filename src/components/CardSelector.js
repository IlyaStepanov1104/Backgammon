'use client';

import { useState, useEffect } from 'react';

export default function CardSelector({ selectedCardIds = [], onSelectionChange, onClose }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCards, setSelectedCards] = useState(selectedCardIds);
  const [selectedTagIds, setSelectedTagIds] = useState([]);

  useEffect(() => {
    fetchCards();
  }, [selectedTagIds]);

  useEffect(() => {
    setSelectedCards(selectedCardIds);
  }, [selectedCardIds]);

  const fetchCards = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedTagIds.length > 0) {
        params.set('tags', selectedTagIds.join(','));
      }

      const response = await fetch(`/api/admin/cards?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch cards');
      }

      const data = await response.json();
      setCards(data.cards || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCardToggle = (cardId) => {
    const newSelection = selectedCards.includes(cardId)
      ? selectedCards.filter(id => id !== cardId)
      : [...selectedCards, cardId];
    
    setSelectedCards(newSelection);
  };

  const handleConfirm = () => {
    onSelectionChange(selectedCards);
    onClose();
  };

  const filteredCards = cards.filter(card =>
    card.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            Ошибка загрузки карточек: {error}
          </div>
          <button
            onClick={onClose}
            className="mt-4 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
          >
            Закрыть
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Выбор карточек для промокода</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Поиск */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Поиск по названию или описанию..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Счетчик выбранных */}
        <div className="mb-4 text-sm text-gray-600">
          Выбрано карточек: {selectedCards.length}
        </div>

        {/* Список карточек */}
        <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md">
          {filteredCards.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              Карточки не найдены
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredCards.map((card) => (
                <div
                  key={card.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer ${
                    selectedCards.includes(card.id) ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                  onClick={() => handleCardToggle(card.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedCards.includes(card.id)}
                          onChange={() => handleCardToggle(card.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-gray-400">#{card.id}</span>
                            <div className="font-medium text-gray-900">{card.title}</div>
                          </div>
                          <div className="text-sm text-gray-600">
                            {card.description ? card.description.substring(0, 100) + '...' : 'Без описания'}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Сложность: {card.difficulty_level || 'Не указана'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Кнопки */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleConfirm}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Подтвердить выбор ({selectedCards.length})
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
