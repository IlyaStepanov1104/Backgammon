'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CardsManagement() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Проверяем авторизацию
    const auth = localStorage.getItem('adminAuth');
    if (!auth) {
      router.push('/admin');
      return;
    }
    
    fetchCards();
  }, [pagination.page, searchTerm, difficultyFilter]);

  const fetchCards = async () => {
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        difficulty: difficultyFilter
      });

      const response = await fetch(`/api/admin/cards?${params}`);

      if (response.ok) {
        const data = await response.json();
        setCards(data.cards);
        setPagination(data.pagination);
      } else {
        setError('Ошибка загрузки карточек');
      }
    } catch (error) {
      setError('Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCard = async (cardData) => {
    try {
      let response;
      
      if (cardData instanceof FormData) {
        // Загрузка файла
        response = await fetch('/api/admin/cards', {
          method: 'POST',
          body: cardData
        });
      } else {
        // Обычные данные
        response = await fetch('/api/admin/cards', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(cardData)
        });
      }

      if (response.ok) {
        setShowCreateForm(false);
        fetchCards();
      } else {
        const data = await response.json();
        setError(data.error || 'Ошибка создания карточки');
      }
    } catch (error) {
      setError('Ошибка соединения с сервером');
    }
  };

  const handleUpdateCard = async (cardData) => {
    try {
      let response;
      
      if (cardData instanceof FormData) {
        // Загрузка файла
        response = await fetch('/api/admin/cards', {
          method: 'PUT',
          body: cardData
        });
      } else {
        // Обычные данные
        response = await fetch('/api/admin/cards', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(cardData)
        });
      }

      if (response.ok) {
        setEditingCard(null);
        fetchCards();
      } else {
        const data = await response.json();
        setError(data.error || 'Ошибка обновления карточки');
      }
    } catch (error) {
      setError('Ошибка соединения с сервером');
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (!confirm('Вы уверены, что хотите удалить эту карточку?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/cards?id=${cardId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchCards();
      } else {
        setError('Ошибка удаления карточки');
      }
    } catch (error) {
      setError('Ошибка соединения с сервером');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Управление карточками
            </h1>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/admin')}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Назад
              </button>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Создать карточку
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Filters */}
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Поиск
                </label>
                <input
                  type="text"
                  placeholder="Поиск по названию или описанию..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Сложность
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                >
                  <option value="">Все</option>
                  <option value="easy">Легкая</option>
                  <option value="medium">Средняя</option>
                  <option value="hard">Сложная</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setDifficultyFilter('');
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Сбросить фильтры
                </button>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {/* Cards List */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {cards.map((card) => (
                <li key={card.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-medium text-gray-900">
                          {card.title}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          card.difficulty_level === 'easy' ? 'bg-green-100 text-green-800' :
                          card.difficulty_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {card.difficulty_level === 'easy' ? 'Легкая' :
                           card.difficulty_level === 'medium' ? 'Средняя' : 'Сложная'}
                        </span>
                      </div>
                      {card.description && (
                        <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                          {card.description}
                        </p>
                      )}
                      <div className="mt-2 text-xs text-gray-500">
                        Создана: {new Date(card.created_at).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingCard(card)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                      >
                        Редактировать
                      </button>
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-6 rounded-lg shadow">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Назад
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
                  disabled={pagination.page === pagination.pages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Вперед
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Показано <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> -{' '}
                    <span className="font-medium">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>{' '}
                    из <span className="font-medium">{pagination.total}</span> результатов
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          pageNum === pagination.page
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Create/Edit Modal */}
      {(showCreateForm || editingCard) && (
        <CardForm
          card={editingCard}
          onSubmit={editingCard ? handleUpdateCard : handleCreateCard}
          onCancel={() => {
            setShowCreateForm(false);
            setEditingCard(null);
          }}
        />
      )}
    </div>
  );
}

// Компонент формы создания/редактирования карточки
function CardForm({ card, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    title: card?.title || '',
    description: card?.description || '',
    image_url: card?.image_url || '',
    correct_moves: card?.correct_moves || '',
    position_description: card?.position_description || '',
    difficulty_level: card?.difficulty_level || 'medium'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Если есть файл изображения, загружаем его
    if (formData.image_file) {
      const formDataToSend = new FormData();
      formDataToSend.append('image', formData.image_file);
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('correct_moves', formData.correct_moves);
      formDataToSend.append('position_description', formData.position_description);
      formDataToSend.append('difficulty_level', formData.difficulty_level);
      
      if (card) {
        formDataToSend.append('id', card.id);
      }
      
      onSubmit(formDataToSend);
    } else {
      // Если файла нет, отправляем обычные данные
      const submitData = card ? { ...formData, id: card.id } : formData;
      onSubmit(submitData);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {card ? 'Редактировать карточку' : 'Создать карточку'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Название *</label>
              <input
                type="text"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Описание</label>
              <textarea
                rows="3"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Изображение *</label>
              <input
                type="file"
                accept="image/*"
                required={!card}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setFormData(prev => ({ ...prev, image_file: file }));
                  }
                }}
              />
              {card?.image_url && (
                <div className="mt-2">
                  <p className="text-sm text-gray-500">Текущее изображение:</p>
                  <img 
                    src={card.image_url} 
                    alt="Текущее изображение" 
                    className="w-32 h-32 object-cover rounded mt-1"
                  />
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Сложность</label>
              <select
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.difficulty_level}
                onChange={(e) => setFormData(prev => ({ ...prev, difficulty_level: e.target.value }))}
              >
                <option value="easy">Легкая</option>
                <option value="medium">Средняя</option>
                <option value="hard">Сложная</option>
              </select>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                {card ? 'Обновить' : 'Создать'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
