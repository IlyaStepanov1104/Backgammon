'use client';

export default function CardListModal({ isOpen, onClose, cards, onCardSelect, currentCardId, title }) {
  if (!isOpen) return null;

  const handleCardClick = (cardId) => {
    onCardSelect(cardId);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 pt-0 border w-full max-w-4xl shadow-lg rounded-md bg-white max-h-[80vh] overflow-y-auto">
        <div className="py-5 flex justify-between items-center sticky top-0 bg-white">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ✕
          </button>
        </div>

        {cards.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Карточки не найдены</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((card) => (
              <div
                key={card.id}
                onClick={() => handleCardClick(card.id)}
                className={`cursor-pointer rounded-lg border-2 p-3 transition-all hover:shadow-md flex flex-col ${card.id === currentCardId
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                {/* Миниатюра изображения - фиксированная высота */}
                <div className="bg-gray-100 rounded overflow-hidden h-32 flex-shrink-0 flex items-center justify-center">
                  <img
                    src={card.image_url}
                    alt={card.title}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>

                {/* Заголовок - фиксированная высота */}
                <h4 className="font-medium text-gray-900 truncate mt-2 h-6 flex-shrink-0">
                  {card.title}
                </h4>

                {/* ID и сложность */}
                <div className="flex items-center justify-between text-sm text-gray-600 mt-1 h-6 flex-shrink-0">
                  <span className="font-mono">#{card.id}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${card.difficulty_level === 'easy' ? 'bg-green-100 text-green-800' :
                      card.difficulty_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                    }`}>
                    {card.difficulty_level === 'easy' ? 'Легкая' :
                      card.difficulty_level === 'medium' ? 'Средняя' : 'Сложная'}
                  </span>
                </div>

                {/* Индикатор текущей карточки - фиксированная высота */}
                <div className="h-4 mt-1 flex-shrink-0">
                  {card.id === currentCardId && (
                    <span className="text-xs text-blue-600 font-medium">
                      Текущая карточка
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end mt-6 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}