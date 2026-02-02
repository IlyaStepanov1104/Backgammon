'use client';

import {useState, useEffect, useRef, Suspense} from 'react';
import {useSearchParams} from 'next/navigation';
import CardListModal from '../../components/CardListModal';

const MiniappContent = () => {
    const searchParams = useSearchParams();
    const telegramId = searchParams.get('user');

    const [cards, setCards] = useState([]);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showFavorites, setShowFavorites] = useState(false);
    const [favorites, setFavorites] = useState([]);
    const [solvedCards, setSolvedCards] = useState([]);
    const [unsolvedCards, setUnsolvedCards] = useState([]);
    const [userResponse, setUserResponse] = useState(null);
    const [showCardListModal, setShowCardListModal] = useState(false);
    const [showSolvedModal, setShowSolvedModal] = useState(false);
    const [showUnsolvedModal, setShowUnsolvedModal] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [showMenu, setShowMenu] = useState(false);
    const [screenshotLoading, setScreenshotLoading] = useState(false);
    const [screenshotStatus, setScreenshotStatus] = useState(null); // 'success' | 'error' | null
    const menuRef = useRef(null);

    useEffect(() => {
        if (telegramId) {
            fetchCards();
            fetchFavorites();
            fetchSolved();
            fetchUnsolved();
        }
    }, [telegramId]);

    useEffect(() => {
        const currentCards = showFavorites ? favorites : cards;
        setUserResponse(currentCards[currentCardIndex]?.response_status === 'correct' ? true : currentCards[currentCardIndex]?.response_status === 'incorrect' ? false : null);
    }, [cards, favorites, currentCardIndex, showFavorites])

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        };

        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMenu]);

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

    const fetchSolved = async () => {
        try {
            const response = await fetch(`/api/miniapp/cards?user=${telegramId}&solved=true&page=1&limit=100`);
            if (response.ok) {
                const data = await response.json();
                setSolvedCards(data.cards);
            }
        } catch (error) {
            console.error('Error fetching solved:', error);
        }
    };

    const fetchUnsolved = async () => {
        try {
            const response = await fetch(`/api/miniapp/cards?user=${telegramId}&solved=false&page=1&limit=100`);
            if (response.ok) {
                const data = await response.json();
                setUnsolvedCards(data.cards);
            }
        } catch (error) {
            console.error('Error fetching unsolved:', error);
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
                    cardId: currentCard.id,
                    isCorrect
                })
            });

            if (response.ok) {
                setUserResponse(isCorrect);
                // Обновляем списки решенных и нерешенных
                fetchSolved();
                fetchUnsolved();
            }
        } catch (error) {
            console.error('Error saving response:', error);
        }
    };

    const handleToggleFavorite = async () => {
        const currentCard = showFavorites ? favorites[currentCardIndex] : cards[currentCardIndex];
        const isFavorite = favorites.some(fav => fav.id === currentCard.id);

        try {
            if (isFavorite) {
                // Удаляем из избранного
                await fetch(`/api/miniapp/favorites?user=${telegramId}&card=${currentCard.id}`, {
                    method: 'DELETE'
                });
                const updatedFavorites = favorites.filter(fav => fav.id !== currentCard.id);
                setFavorites(updatedFavorites);

                // Если мы в режиме избранного и удалили последнюю карточку, переключаемся на все карточки
                if (showFavorites && updatedFavorites.length === 0) {
                    switchToAllCards();
                } else if (showFavorites) {
                    // Если удалили карточку в режиме избранного, переходим на предыдущую или первую
                    const newIndex = currentCardIndex >= updatedFavorites.length
                        ? Math.max(0, updatedFavorites.length - 1)
                        : currentCardIndex;
                    setCurrentCardIndex(newIndex);
                }
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
        if (currentCardIndex < currentCards.length - 1) {
            setCurrentCardIndex(currentCardIndex + 1);
            setShowAnswer(false);
            setCurrentImageIndex(0); // Сброс индекса изображения при смене карточки
        }
    };

    const prevCard = () => {
        if (currentCardIndex > 0) {
            setCurrentCardIndex(currentCardIndex - 1);
            setShowAnswer(false);
            setCurrentImageIndex(0); // Сброс индекса изображения при смене карточки
        }
    };

    const nextImage = () => {
        if (currentCard) {
            const images = getAvailableImages(currentCard);
            if (images.length > 1 && currentImageIndex < images.length - 1) {
                setCurrentImageIndex(currentImageIndex + 1);
            }
        }
    };

    const prevImage = () => {
        if (currentImageIndex > 0) {
            setCurrentImageIndex(currentImageIndex - 1);
        }
    };

    const switchToFavorites = () => {
        if (favorites.length === 0) {
            alert('У вас пока нет избранных карточек. Добавьте карточки в избранное, чтобы они здесь появились.');
            return;
        }
        setShowFavorites(true);
        setCurrentCardIndex(0);
        setCurrentImageIndex(0);
        setShowAnswer(false);
        setUserResponse(null);
    };

    const switchToAllCards = () => {
        setShowFavorites(false);
        setCurrentCardIndex(0);
        setCurrentImageIndex(0);
        setShowAnswer(false);
        setUserResponse(null);
    };

    const handleCardSelect = (cardId) => {
        const cardIndex = cards.findIndex(card => card.id === cardId);
        if (cardIndex !== -1) {
            setCurrentCardIndex(cardIndex);
            setShowAnswer(false);
            setUserResponse(null);
            setCurrentImageIndex(0); // Сброс индекса изображения
            // Если мы были в режиме избранного, переключаемся на все карточки
            if (showFavorites) {
                setShowFavorites(false);
            }
        }
    };

    const handleScreenshot = async () => {
        const currentCard = showFavorites ? favorites[currentCardIndex] : cards[currentCardIndex];

        if (!currentCard) {
            setScreenshotStatus('error');
            setTimeout(() => setScreenshotStatus(null), 3000);
            return;
        }

        setScreenshotLoading(true);
        setScreenshotStatus(null);

        try {
            const response = await fetch('/api/miniapp/screenshot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cardId: currentCard.id,
                    telegramId: telegramId
                })
            });

            if (!response.ok) {
                throw new Error('Ошибка отправки скриншота');
            }

            const data = await response.json();

            if (data.success) {
                setScreenshotStatus('success');
            } else {
                setScreenshotStatus('error');
            }
        } catch (error) {
            console.error('Screenshot error:', error);
            setScreenshotStatus('error');
        } finally {
            setScreenshotLoading(false);
            // Сброс статуса через 3 секунды
            setTimeout(() => setScreenshotStatus(null), 3000);
        }
    };

    const getAvailableImages = (card) => {
        const images = [];
        if (card.image_url) {
            images.push({ url: card.image_url, caption: 'Позиция' });
        }
        if (card.image_url_2) {
            images.push({ url: card.image_url_2, caption: 'Ход в партии' });
        }
        if (card.image_url_3) {
            images.push({ url: card.image_url_3, caption: 'Лучший ход' });
        }
        return images;
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
        if (showFavorites && favorites.length === 0) {
            return (
                <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                    <div className="text-center max-w-md mx-4">
                        <div className="text-6xl mb-4">⭐</div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">Нет избранных карточек</h1>
                        <p className="text-gray-600 mb-6">
                            Добавьте карточки в избранное, чтобы они здесь появились. Для этого откройте карточку, нажмите "Показать ответ" и затем "В избранное".
                        </p>
                        <button
                            onClick={switchToAllCards}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
                        >
                            Перейти ко всем карточкам
                        </button>
                    </div>
                </div>
            );
        }
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
                {/* Header with Favorites Button and List Button */}
                <div className="flex justify-between items-center mb-4">
                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg font-medium flex items-center gap-2"
                        >
                            <span>☰</span>
                            <span>Меню</span>
                        </button>
                        {showMenu && (
                            <div ref={menuRef} className="absolute top-full left-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-max">
                                <button
                                    onClick={() => { showFavorites ? switchToAllCards() : switchToFavorites(); setShowMenu(false); }}
                                    disabled={!showFavorites && favorites.length === 0}
                                    className={`w-full text-left px-4 py-2 rounded-t-lg font-medium flex items-center gap-2 ${
                                        showFavorites
                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                            : favorites.length === 0
                                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                            : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                    }`}
                                    title={favorites.length === 0 ? 'Добавьте карточки в избранное' : ''}
                                >
                                    <span>⭐</span>
                                    <span>{showFavorites ? 'Все карточки' : `Избранное (${favorites.length})`}</span>
                                </button>
                                <button
                                    onClick={() => { setShowSolvedModal(true); setShowMenu(false); }}
                                    disabled={solvedCards.length === 0}
                                    className={`w-full text-left px-4 py-2 font-medium flex items-center gap-2 ${
                                        solvedCards.length === 0
                                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                                    }`}
                                    title={solvedCards.length === 0 ? 'Решенных карточек пока нет' : ''}
                                >
                                    <span>✅</span>
                                    <span>Решенные ({solvedCards.length})</span>
                                </button>
                                <button
                                    onClick={() => { setShowUnsolvedModal(true); setShowMenu(false); }}
                                    disabled={unsolvedCards.length === 0}
                                    className={`w-full text-left px-4 py-2 font-medium flex items-center gap-2 ${
                                        unsolvedCards.length === 0
                                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                                    }`}
                                    title={unsolvedCards.length === 0 ? 'Нерешенных карточек пока нет' : ''}
                                >
                                    <span>❓</span>
                                    <span>Нерешенные ({unsolvedCards.length})</span>
                                </button>
                                <button
                                    onClick={() => { setShowCardListModal(true); setShowMenu(false); }}
                                    className="w-full text-left px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-b-lg font-medium flex items-center gap-2"
                                    title="Показать список всех карточек"
                                >
                                    <span>📋</span>
                                    <span>Список</span>
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="text-center">
                        <span className="text-sm text-gray-600">
                            Карточка {currentCardIndex + 1} из {currentCards.length}
                        </span>
                        {showFavorites && (
                            <div className="text-xs text-gray-500 mt-1">
                                Режим избранного
                            </div>
                        )}
                    </div>
                </div>

                {/* Card */}
                <div className="bg-white rounded-lg shadow-lg">
                    {/* Card Image */}
                    <div className="sticky top-0 z-10 bg-white shadow-sm">
                        {(() => {
                            const images = getAvailableImages(currentCard);
                            const currentImage = images[currentImageIndex] || images[0];

                            return (
                                <div className="relative">
                                    {/* Image */}
                                    <img
                                        src={currentImage.url}
                                        alt={currentCard.title}
                                        className="w-full h-auto max-h-96 object-contain"
                                    />

                                    {/* Caption */}
                                    <div className="text-center py-2 relative">
                                        {images.length > 1 && (
                                            <>
                                                <button
                                                    onClick={prevImage}
                                                    disabled={currentImageIndex === 0}
                                                    className={`absolute left-2 top-1/2 transform -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black bg-opacity-50 text-white flex items-center justify-center hover:bg-opacity-70 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity`}
                                                    style={{ fontSize: '20px' }}
                                                >
                                                    ‹
                                                </button>
                                                <button
                                                    onClick={nextImage}
                                                    disabled={currentImageIndex === images.length - 1}
                                                    className={`absolute right-2 top-1/2 transform -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black bg-opacity-50 text-white flex items-center justify-center hover:bg-opacity-70 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity`}
                                                    style={{ fontSize: '20px' }}
                                                >
                                                    ›
                                                </button>
                                            </>
                                        )}
                                        <span className="text-sm font-medium">
                                            {currentImage.caption}
                                        </span>
                                        {images.length > 1 && (
                                            <span className="text-xs ml-2 opacity-75">
                                                ({currentImageIndex + 1}/{images.length})
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
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
                                        <div
                                            className="text-gray-700 leading-relaxed"
                                            style={{
                                                wordWrap: 'break-word',
                                                overflowWrap: 'break-word'
                                            }}
                                            dangerouslySetInnerHTML={{
                                                __html: currentCard.description
                                            }}
                                        />
                                        <style jsx global>{`
                                            .text-gray-700 strong {
                                                font-weight: bold;
                                            }
                                            .text-gray-700 em {
                                                font-style: italic;
                                            }
                                            .text-gray-700 u {
                                                text-decoration: underline;
                                            }
                                            .text-gray-700 p {
                                                margin: 0.5em 0;
                                            }
                                            .text-gray-700 p:first-child {
                                                margin-top: 0;
                                            }
                                            .text-gray-700 p:last-child {
                                                margin-bottom: 0;
                                            }
                                        `}</style>
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
                                                ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                    >
                                        {favorites.some(fav => fav.id === currentCard.id)
                                            ? (showFavorites ? 'Удалить из избранного' : 'В избранном')
                                            : 'В избранное'}
                                    </button>

                                    <button
                                        onClick={handleScreenshot}
                                        disabled={screenshotLoading || screenshotStatus !== null}
                                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                            screenshotStatus === 'success'
                                                ? 'bg-green-500 text-white cursor-not-allowed'
                                                : screenshotStatus === 'error'
                                                ? 'bg-red-500 text-white cursor-not-allowed'
                                                : screenshotLoading
                                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                    >
                                        📸 {screenshotStatus === 'success'
                                            ? 'Отправлено!'
                                            : screenshotStatus === 'error'
                                            ? 'Ошибка'
                                            : screenshotLoading
                                            ? 'Создание...'
                                            : 'Скриншот'}
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
                        disabled={currentCardIndex === 0}
                        className={`px-6 py-3 rounded-lg font-medium ${
                            currentCardIndex === 0
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
                        disabled={currentCardIndex === currentCards.length - 1}
                        className={`px-6 py-3 rounded-lg font-medium ${
                            currentCardIndex === currentCards.length - 1
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                    >
                        Вперед →
                    </button>
                </div>
            </main>

            {/* Card List Modal */}
            <CardListModal
                isOpen={showCardListModal}
                onClose={() => setShowCardListModal(false)}
                cards={showFavorites ? favorites : cards}
                onCardSelect={handleCardSelect}
                currentCardId={currentCard.id}
                title="Все доступные карточки"
            />

            {/* Solved Cards Modal */}
            <CardListModal
                isOpen={showSolvedModal}
                onClose={() => setShowSolvedModal(false)}
                cards={solvedCards}
                onCardSelect={handleCardSelect}
                currentCardId={currentCard.id}
                title="Решенные карточки"
            />

            {/* Unsolved Cards Modal */}
            <CardListModal
                isOpen={showUnsolvedModal}
                onClose={() => setShowUnsolvedModal(false)}
                cards={unsolvedCards}
                onCardSelect={handleCardSelect}
                currentCardId={currentCard.id}
                title="Нерешенные карточки"
            />
        </div>
    );
}

export default function Miniapp() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-xl">Загрузка...</div>
            </div>
        }>
            <MiniappContent />
        </Suspense>
    );
}
