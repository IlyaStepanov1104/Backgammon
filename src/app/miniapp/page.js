'use client';

import {useState, useEffect} from 'react';
import {useSearchParams} from 'next/navigation';

export default function Miniapp() {
    const searchParams = useSearchParams();
    const telegramId = searchParams.get('user');

    const [cards, setCards] = useState([]);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showFavorites, setShowFavorites] = useState(false);
    const [favorites, setFavorites] = useState([]);
    const [userResponse, setUserResponse] = useState(null);
    console.log("%c 2 --> Line: 18||page.js\n userResponse: ", "color:#0f0;", userResponse);

    useEffect(() => {
        if (telegramId) {
            fetchCards();
            fetchFavorites();
        }
    }, [telegramId]);

    useEffect(() => {
        setUserResponse(cards[currentCardIndex]?.is_correct !== undefined ? Boolean(cards[currentCardIndex].is_correct) : null);
    }, [cards[currentCardIndex]])

    const fetchCards = async () => {
        try {
            const response = await fetch(`/api/miniapp/cards?user=${telegramId}&page=1&limit=100`);
            if (response.ok) {
                const data = await response.json();
                setCards(data.cards);
            } else {
                setError('Ошибка загрузки карточек');
            }
        } catch (error) {
            setError('Ошибка соединения с сервером');
        } finally {
            setLoading(false);
        }
    };

    const fetchFavorites = async () => {
        try {
            const response = await fetch(`/api/miniapp/cards?user=${telegramId}&favorites=true&page=1&limit=100`);
            if (response.ok) {
                const data = await response.json();
                setFavorites(data.cards);
            }
        } catch (error) {
            console.error('Error fetching favorites:', error);
        }
    };

    const handleShowAnswer = () => {
        setShowAnswer(true);
    };

    const handleResponse = async (isCorrect) => {
        try {
            const response = await fetch('/api/miniapp/cards', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    telegramId,
                    cardId: cards[currentCardIndex].id,
                    isCorrect
                })
            });

            if (response.ok) {
                setUserResponse(isCorrect);
            }
        } catch (error) {
            console.error('Error saving response:', error);
        }
    };

    const handleToggleFavorite = async () => {
        const currentCard = cards[currentCardIndex];
        const isFavorite = favorites.some(fav => fav.id === currentCard.id);

        try {
            if (isFavorite) {
                // Удаляем из избранного
                await fetch(`/api/miniapp/favorites?user=${telegramId}&card=${currentCard.id}`, {
                    method: 'DELETE'
                });
                setFavorites(favorites.filter(fav => fav.id !== currentCard.id));
            } else {
                // Добавляем в избранное
                await fetch('/api/miniapp/favorites', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        telegramId,
                        cardId: currentCard.id
                    })
                });
                setFavorites([...favorites, currentCard]);
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
        }
    };

    const nextCard = () => {
        if (userResponse !== null && currentCardIndex < cards.length - 1) {
            setCurrentCardIndex(currentCardIndex + 1);
            setShowAnswer(false);
            setUserResponse(null);
        }
    };

    const prevCard = () => {
        if (userResponse !== null && currentCardIndex > 0) {
            setCurrentCardIndex(currentCardIndex - 1);
            setShowAnswer(false);
            setUserResponse(null);
        }
    };

    const switchToFavorites = () => {
        setShowFavorites(true);
        setCurrentCardIndex(0);
        setShowAnswer(false);
        setUserResponse(null);
    };

    const switchToAllCards = () => {
        setShowFavorites(false);
        setCurrentCardIndex(0);
        setShowAnswer(false);
        setUserResponse(null);
    };

    if (!telegramId) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Ошибка</h1>
                    <p className="text-gray-600">Не указан ID пользователя</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-xl">Загрузка карточек...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Ошибка</h1>
                    <p className="text-gray-600">{error}</p>
                </div>
            </div>
        );
    }

    const currentCards = showFavorites ? favorites : cards;
    const currentCard = currentCards[currentCardIndex];

    if (!currentCard) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Нет доступных карточек</h1>
                    <p className="text-gray-600">Обратитесь к администратору для получения доступа</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Main Content */}
            <main className="max-w-4xl mx-auto py-6 px-4">
                {/* Card Counter */}
                <div className="text-center mb-4">
          <span className="text-sm text-gray-600">
            Карточка {currentCardIndex + 1} из {currentCards.length}
          </span>
                </div>

                {/* Card */}
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    {/* Card Image */}
                    <div className="relative">
                        <img
                            src={currentCard.image_url}
                            alt={currentCard.title}
                            className="w-full h-auto max-h-96 object-contain"
                        />
                    </div>

                    {/* Card Content */}
                    <div className="p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">
                            {currentCard.title}
                        </h2>

                        {showAnswer && (
                            <>
                                {currentCard.description && (
                                    <div className="mb-6">
                                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                                            {currentCard.description}
                                        </p>
                                    </div>
                                )}

                                {/* Response Buttons */}
                                <div className="flex space-x-4 mb-6">
                                    <button
                                        onClick={() => handleResponse(false)}
                                        className={`flex-1 py-3 px-4 rounded-lg font-medium ${
                                            userResponse === false
                                                ? 'bg-red-600 text-white'
                                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                                        }`}
                                    >
                                        Неправильно
                                    </button>
                                    <button
                                        onClick={() => handleResponse(true)}
                                        className={`flex-1 py-3 px-4 rounded-lg font-medium ${
                                            userResponse === true
                                                ? 'bg-green-600 text-white'
                                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                                        }`}
                                    >
                                        Правильно
                                    </button>
                                </div>
                            </>
                        )}

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-3">
                            {!showAnswer ? (
                                <button
                                    onClick={handleShowAnswer}
                                    className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium col-span-2"
                                >
                                    Показать ответ
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={handleToggleFavorite}
                                        className={`px-4 py-2 rounded-lg font-medium ${
                                            favorites.some(fav => fav.id === currentCard.id)
                                                ? 'bg-yellow-600 text-white'
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                    >
                                        {favorites.some(fav => fav.id === currentCard.id) ? 'В избранном' : 'В избранное'}
                                    </button>

                                    <button
                                        onClick={() => {
                                            // Здесь можно добавить функционал для скриншота
                                            alert('Функция скриншота будет добавлена при релизе');
                                        }}
                                        className="px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg font-medium"
                                    >
                                        📸 Скриншот
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex justify-between items-center mt-6">
                    <button
                        onClick={prevCard}
                        disabled={currentCardIndex === 0 || userResponse === null}
                        className={`px-6 py-3 rounded-lg font-medium ${
                            currentCardIndex === 0 || userResponse === null
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                    >
                        ← Назад
                    </button>
                    <div className="bg-white bg-opacity-90 rounded-lg p-2">
                <span className="text-sm font-medium text-gray-900">
                  #{currentCard.id}
                </span>
                    </div>
                    <button
                        onClick={nextCard}
                        disabled={currentCardIndex === currentCards.length - 1 || userResponse === null}
                        className={`px-6 py-3 rounded-lg font-medium ${
                            currentCardIndex === currentCards.length - 1 || userResponse === null
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                    >
                        Вперед →
                    </button>
                </div>
            </main>
        </div>
    );
}
