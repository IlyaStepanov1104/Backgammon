'use client';

export default function CardListModal({ isOpen, onClose, cards, onCardSelect, currentCardId, title }) {
  if (!isOpen) return null;

  const handleCardClick = (cardId) => {
    onCardSelect(cardId);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
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
                className={`cursor-pointer rounded-lg border-2 p-4 transition-all hover:shadow-md ${
                  card.id === currentCardId
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Миниатюра изображения */}
                <div className="bg-gray-100 rounded mb-3 overflow-hidden">
                  <img
                    src={card.image_url}
                    alt={card.title}
                    className="w-full h-full "
                  />
                </div>

                {/* Информация о карточке */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-1 truncate">
                    {card.title}
                  </h4>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span className="font-mono">#{card.id}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      card.difficulty_level === 'easy' ? 'bg-green-100 text-green-800' :
                      card.difficulty_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {card.difficulty_level === 'easy' ? 'Легкая' :
                       card.difficulty_level === 'medium' ? 'Средняя' : 'Сложная'}
                    </span>
                  </div>

                  {/* Метки */}
                  {card.tags && card.tags.split(', ').length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {card.tags.split(', ').slice(0, 3).map((tag, index) => (
                        <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {tag}
                        </span>
                      ))}
                      {card.tags.split(', ').length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{card.tags.split(', ').length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Индикатор текущей карточки */}
                  {card.id === currentCardId && (
                    <div className="mt-2 text-xs text-blue-600 font-medium">
                      Текущая карточка
                    </div>
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