'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const ScreenshotContent = () => {
    const searchParams = useSearchParams();
    const cardId = searchParams.get('cardId');
    const [cardData, setCardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!cardId) {
            setError('ID карточки не указан');
            setLoading(false);
            return;
        }

        // Загружаем данные карточки с API
        fetch(`/api/miniapp/card/${cardId}`)
            .then(res => {
                if (!res.ok) throw new Error('Ошибка загрузки карточки');
                return res.json();
            })
            .then(data => {
                setCardData(data);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, [cardId]);

    if (loading) {
        return null;
    }

    if (error || !cardData) {
        return (
            <div className="p-5">
                <p>Ошибка: {error || 'данные карточки не найдены'}</p>
            </div>
        );
    }

    // Берем только первое изображение с подписью
    let firstImage = null;
    if (cardData.image_url) {
        firstImage = { url: cardData.image_url, caption: 'Позиция' };
    } else if (cardData.image_url_2) {
        firstImage = { url: cardData.image_url_2, caption: 'Ход в партии' };
    } else if (cardData.image_url_3) {
        firstImage = { url: cardData.image_url_3, caption: 'Лучший ход' };
    }

    return (
        <div id="screenshot-card" className='mx-auto p-1'>
            <div className="bg-white rounded-lg border overflow-hidden p-4 flex flex-col gap-4">
                {/* Картинка с подписью */}
                {firstImage && (
                    <div>
                        <div className="flex items-center justify-center">
                            <img
                                src={firstImage.url}
                                alt={firstImage.caption}
                                className="w-full h-auto max-h-96 object-contain"
                            />
                        </div>
                        <div className="flex items-center justify-center text-sm font-medium mt-2">
                            {firstImage.caption}
                        </div>
                    </div>
                )}

                {/* Заголовок и описание */}
                <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                        {cardData.title}
                    </h2>

                    {cardData.description && (
                        <div>
                            <div
                                className="text-gray-700 leading-relaxed"
                                style={{
                                    wordWrap: 'break-word',
                                    overflowWrap: 'break-word'
                                }}
                                dangerouslySetInnerHTML={{
                                    __html: cardData.description
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
                </div>
            </div>
        </div>
    );
};

export default function Screenshot() {
    return (
        <Suspense fallback={null}>
            <ScreenshotContent />
        </Suspense>
    );
}