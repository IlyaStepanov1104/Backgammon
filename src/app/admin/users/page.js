'use client';

import {useState, useEffect} from 'react';
import {useRouter} from 'next/navigation';
import CardSelectorWithRange from '../../../components/CardSelectorWithRange';
import Modal from '../../../components/Modal';

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [hasAccess, setHasAccess] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [showAccessModal, setShowAccessModal] = useState(false);
    const [selectedCards, setSelectedCards] = useState([]);
    const [expiresAt, setExpiresAt] = useState('');
    const [error, setError] = useState('');
    const [showFavoritesModal, setShowFavoritesModal] = useState(false);
    const [userFavorites, setUserFavorites] = useState([]);
    const [loadingFavorites, setLoadingFavorites] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const auth = localStorage.getItem('adminAuth');
        if (!auth) {
            router.push('/admin');
            return;
        }
        fetchUsers();
    }, [pagination.page, pagination.limit, searchTerm, hasAccess, router]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: pagination.page,
                limit: pagination.limit,
                search: searchTerm,
                hasAccess: hasAccess
            });

            const response = await fetch(`/api/admin/users?${params}`);
            if (response.ok) {
                const data = await response.json();
                setUsers(data.users);
                setPagination(data.pagination);
            } else {
                console.error('Failed to fetch users');
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserActiveCards = async (userId) => {
        try {
            const response = await fetch(`/api/admin/users/${userId}/cards`);
            if (response.ok) {
                const data = await response.json();
                setSelectedCards(data.activeCardIds || []); // массив ID активных карточек
            }
        } catch (error) {
            console.error('Error fetching active cards:', error);
        }
    };

    const fetchUserFavorites = async (userId) => {
        try {
            setLoadingFavorites(true);
            const response = await fetch(`/api/admin/users/${userId}/favorites`);
            if (response.ok) {
                const data = await response.json();
                setUserFavorites(data.favorites || []);
                setShowFavoritesModal(true);
            } else {
                console.error('Failed to fetch favorites');
            }
        } catch (error) {
            console.error('Error fetching favorites:', error);
        } finally {
            setLoadingFavorites(false);
        }
    };

    const handleRemoveFavorite = async (userId, cardId) => {
        try {
            const response = await fetch(`/api/admin/users/${userId}/favorites?cardId=${cardId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // Обновляем список избранных
                setUserFavorites(prev => prev.filter(fav => fav.id !== cardId));
                // Обновляем список пользователей
                fetchUsers();
            } else {
                console.error('Failed to remove favorite');
            }
        } catch (error) {
            console.error('Error removing favorite:', error);
        }
    };


    const handleGrantAccess = async () => {
        if (!selectedUser) return;

        setError('');

        if (selectedCards.length === 0) {
            setError('Выберите хотя бы одну карточку');
            return;
        }

        try {
            const response = await fetch(`/api/admin/users`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    userId: selectedUser.id,
                    cardIds: selectedCards,
                    expiresAt: expiresAt || null
                })
            });

            if (response.ok) {
                setShowAccessModal(false);
                setSelectedUser(null);
                setSelectedCards([]);
                setExpiresAt('');
                setError('');
                fetchUsers();
            } else {
                const data = await response.json();
                setError(data.error || 'Ошибка при предоставлении доступа');
            }
        } catch (error) {
            console.error('Error granting access:', error);
            setError('Ошибка соединения с сервером');
        }
    };

    const handleRevokeAccess = async (userId, cardId = null) => {
        try {
            const params = new URLSearchParams({userId});
            if (cardId) params.append('cardId', cardId);

            const response = await fetch(`/api/admin/users?${params}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                fetchUsers();
            } else {
                console.error('Failed to revoke access');
            }
        } catch (error) {
            console.error('Error revoking access:', error);
        }
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('ru-RU');
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <h1 className="text-3xl font-bold text-gray-900">
                            Управление пользователями
                        </h1>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => router.push('/admin')}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                            >
                                Назад
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Фильтры */}
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="bg-white p-6 rounded-lg shadow mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Поиск
                                </label>
                                <input
                                    type="text"
                                    placeholder="Имя или username..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Группы
                                </label>
                                <select
                                    value={hasAccess}
                                    onChange={(e) => setHasAccess(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Все пользователи</option>
                                    <option value="true">С доступом</option>
                                    <option value="false">Без доступа</option>
                                </select>
                            </div>
                            <div className="flex items-end">
                                <button
                                    onClick={() => {
                                        setSearchTerm('');
                                        setHasAccess('');
                                        setPagination(prev => ({...prev, page: 1}));
                                    }}
                                    className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-3 rounded-md text-sm font-medium"
                                >
                                    Сбросить
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Таблица пользователей */}
                    {loading ? (
                        <div className="bg-white rounded-lg shadow p-12">
                            <div className="text-center">
                                <p className="text-gray-500 text-lg">Загрузка...</p>
                            </div>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="bg-white rounded-lg shadow p-12">
                            <div className="text-center">
                                <p className="text-gray-500 text-lg">Пользователи не найдены</p>
                                <p className="text-gray-400 text-sm mt-2">Попробуйте изменить параметры поиска</p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            ID
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Пользователь
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Telegram ID
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Доступ к карточкам
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Избранные
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Статистика
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Группы
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Дата регистрации
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Действия
                                        </th>
                                    </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                    {users.map((user) => (
                                        <tr key={user.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                #{user.id}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {user.first_name} {user.last_name}
                                                    </div>
                                                    <div className="text-sm text-gray-500">@{user.username}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {user.telegram_id}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {user.accessible_cards || 0} карточек
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <button
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        fetchUserFavorites(user.id);
                                                    }}
                                                    className="text-blue-600 hover:text-blue-900 underline"
                                                >
                                                    {user.favorite_cards || 0} карточек
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <div className="text-green-600">✅ {user.solved_cards || 0}</div>
                                                <div className="text-red-600">❓ {user.unsolved_cards || 0}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {/* Здесь будут группы пользователя */}
                                                Группы
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {formatDateTime(user.created_at)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <button
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        fetchUserActiveCards(user.id).then(() => {
                                                            setShowAccessModal(true);
                                                        });
                                                    }}
                                                    className="text-indigo-600 hover:text-indigo-900 mr-3"
                                                >
                                                    Дать доступ
                                                </button>
                                                <button
                                                    onClick={() => handleRevokeAccess(user.id)}
                                                    className="text-red-600 hover:text-red-900"
                                                >
                                                    Отозвать доступ
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Пагинация */}
                    {pagination.pages > 1 && (
                        <div className="flex justify-center mt-6">
                            <nav className="flex space-x-2">
                                <button
                                    onClick={() => setPagination(prev => ({...prev, page: prev.page - 1}))}
                                    disabled={pagination.page === 1}
                                    className="px-3 py-2 border rounded disabled:opacity-50"
                                >
                                    Назад
                                </button>
                                <span className="px-3 py-2">
              Страница {pagination.page} из {pagination.pages}
            </span>
                                <button
                                    onClick={() => setPagination(prev => ({...prev, page: prev.page + 1}))}
                                    disabled={pagination.page === pagination.pages}
                                    className="px-3 py-2 border rounded disabled:opacity-50"
                                >
                                    Вперед
                                </button>
                            </nav>
                        </div>
                    )}

                    {/* Модальное окно для предоставления доступа */}
                    <Modal
                        isOpen={showAccessModal}
                        onClose={() => {
                            setShowAccessModal(false);
                            setError('');
                            setSelectedCards([]);
                            setExpiresAt('');
                        }}
                        title={`Предоставить доступ пользователю ${selectedUser?.first_name}`}
                        maxWidth="sm:max-w-md"
                        footer={
                            <>
                                <button
                                    onClick={handleGrantAccess}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    Предоставить доступ
                                </button>
                                <button
                                    onClick={() => {
                                        setShowAccessModal(false);
                                        setError('');
                                        setSelectedCards([]);
                                        setExpiresAt('');
                                    }}
                                    className="px-4 py-2 border rounded"
                                >
                                    Отмена
                                </button>
                            </>
                        }
                    >
                        {error && (
                            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                                {error}
                            </div>
                        )}

                        <div className="mb-4">
                            <CardSelectorWithRange
                                selectedCardIds={selectedCards}
                                onSelectionChange={setSelectedCards}
                                label="Выберите карточки"
                                required={true}
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Дата истечения (необязательно):</label>
                            <input
                                type="datetime-local"
                                value={expiresAt}
                                onChange={(e) => setExpiresAt(e.target.value)}
                                className="w-full border p-2 rounded"
                            />
                        </div>
                    </Modal>

                    {/* Модальное окно для просмотра избранных карточек */}
                    <Modal
                        isOpen={showFavoritesModal && !!selectedUser}
                        onClose={() => {
                            setShowFavoritesModal(false);
                            setSelectedUser(null);
                            setUserFavorites([]);
                        }}
                        title={`Избранные карточки пользователя ${selectedUser?.first_name}`}
                        maxWidth="sm:max-w-2xl"
                        footer={
                            <button
                                onClick={() => {
                                    setShowFavoritesModal(false);
                                    setSelectedUser(null);
                                    setUserFavorites([]);
                                }}
                                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                            >
                                Закрыть
                            </button>
                        }
                    >
                        {loadingFavorites ? (
                            <div className="text-center py-8">Загрузка...</div>
                        ) : userFavorites.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                У пользователя нет избранных карточек
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {userFavorites.map((favorite) => (
                                    <div
                                                key={favorite.id}
                                                className="border rounded-lg p-4 flex items-center justify-between hover:bg-gray-50"
                                            >
                                                <div className="flex items-center space-x-4 flex-1">
                                                    {favorite.image_url && (
                                                        <img
                                                            src={favorite.image_url}
                                                            alt={favorite.title}
                                                            className="w-16 rounded"
                                                        />
                                                    )}
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                        <span
                                                            className="text-sm font-mono text-gray-400">#{favorite.id}</span>
                                                            <h4 className="font-medium text-gray-900">{favorite.title}</h4>
                                                        </div>
                                                        {favorite.description && (
                                                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                                                {favorite.description}
                                                            </p>
                                                        )}
                                                        <div
                                                            className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                                    <span>
                                                        Сложность: {favorite.difficulty_level === 'easy' ? 'Легкая' :
                                                        favorite.difficulty_level === 'medium' ? 'Средняя' : 'Сложная'}
                                                    </span>
                                                            <span>
                                                        Добавлено: {new Date(favorite.favorite_added_at).toLocaleDateString('ru-RU')}
                                                    </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveFavorite(selectedUser.id, favorite.id)}
                                                    className="ml-4 text-red-600 hover:text-red-900 px-3 py-2 rounded hover:bg-red-50"
                                                    title="Удалить из избранного"
                                                >
                                                    Удалить
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                    </Modal>
                </div>
            </main>
        </div>
    );
}
