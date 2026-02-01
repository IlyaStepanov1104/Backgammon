'use client';

import {useState, useEffect} from 'react';
import {useRouter} from 'next/navigation';

export default function AdminPanel() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    useEffect(() => {
        // Проверяем, есть ли сохраненная авторизация
        const auth = localStorage.getItem('adminAuth');
        if (auth) {
            const authData = JSON.parse(auth);
            setIsAuthenticated(true);
            setUsername(authData.username);
        }
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({username, password}),
            });

            const data = await response.json();

            if (response.ok) {
                // Сохраняем информацию об авторизации
                localStorage.setItem('adminAuth', JSON.stringify({
                    username: data.admin.username,
                    timestamp: Date.now()
                }));
                setIsAuthenticated(true);
                setError('');
            } else {
                setError(data.error || 'Ошибка авторизации');
            }
        } catch (error) {
            setError('Ошибка соединения с сервером');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('adminAuth');
        setIsAuthenticated(false);
        setUsername('');
        setPassword('');
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
                    <div>
                        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                            Админ-панель
                        </h2>
                        <p className="mt-2 text-center text-sm text-gray-600">
                            Войдите в систему для управления карточками
                        </p>
                    </div>

                    <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                        {error && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                                Имя пользователя
                            </label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                required
                                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Введите имя пользователя"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                Пароль
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Введите пароль"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                            >
                                {loading ? 'Вход...' : 'Войти'}
                            </button>
                        </div>
                    </form>
                </div>
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
                            Админ-панель
                        </h1>
                        <div className="flex items-center space-x-4">
                            <span className="text-gray-700">Добро пожаловать, {username}</span>
                            <button
                                onClick={handleLogout}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                            >
                                Выйти
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Карточки */}
                        <div className="bg-white overflow-hidden shadow rounded-lg">
                            <div className="p-5">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div
                                            className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor"
                                                 viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 truncate">
                                                Управление карточками
                                            </dt>
                                            <dd>
                                                <div className="text-lg font-medium text-gray-900">
                                                    Создание и редактирование
                                                </div>
                                            </dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-5 py-3">
                                <div className="text-sm">
                                    <button
                                        onClick={() => router.push('/admin/cards')}
                                        className="font-medium text-blue-600 hover:text-blue-500"
                                    >
                                        Перейти к карточкам
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Пользователи */}
                        <div className="bg-white overflow-hidden shadow rounded-lg">
                            <div className="p-5">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div
                                            className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none"
                                                 className="w-5 h-5 text-white"
                                                 viewBox="0 0 24 24">
                                                <path stroke="currentColor" strokeLinecap="round"
                                                      strokeLinejoin="round"
                                                      strokeWidth="2"
                                                      d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7Z"/>
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 truncate">
                                                Управление пользователями
                                            </dt>
                                            <dd>
                                                <div className="text-lg font-medium text-gray-900">
                                                    Доступ и права
                                                </div>
                                            </dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-5 py-3">
                                <div className="text-sm">
                                    <button
                                        onClick={() => router.push('/admin/users')}
                                        className="font-medium text-green-600 hover:text-green-500"
                                    >
                                        Перейти к пользователям
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Группы пользователей */}
                        <div className="bg-white overflow-hidden shadow rounded-lg">
                            <div className="p-5">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div
                                            className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none"
                                                  className="w-5 h-5 text-white"
                                                  viewBox="0 0 24 24">
                                                <path stroke="currentColor" strokeLinecap="round"
                                                       strokeLinejoin="round"
                                                       strokeWidth="2"
                                                       d="M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm6 3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/>
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 truncate">
                                                Группы пользователей
                                            </dt>
                                            <dd>
                                                <div className="text-lg font-medium text-gray-900">
                                                    Объединение и управление
                                                </div>
                                            </dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-5 py-3">
                                <div className="text-sm">
                                    <button
                                        onClick={() => router.push('/admin/groups')}
                                        className="font-medium text-yellow-600 hover:text-yellow-500"
                                    >
                                        Перейти к группам
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Промокоды */}
                        <div className="bg-white overflow-hidden shadow rounded-lg">
                            <div className="p-5">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div
                                            className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor"
                                                 viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 truncate">
                                                Промокоды
                                            </dt>
                                            <dd>
                                                <div className="text-lg font-medium text-gray-900">
                                                    Система доступа
                                                </div>
                                            </dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-5 py-3">
                                <div className="text-sm">
                                    <button
                                        onClick={() => router.push('/admin/promocodes')}
                                        className="font-medium text-purple-600 hover:text-purple-500"
                                    >
                                        Перейти к промокодам
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Пакеты */}
                        <div className="bg-white overflow-hidden shadow rounded-lg">
                            <div className="p-5">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div
                                            className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor"
                                                 viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 truncate">
                                                Пакеты карточек
                                            </dt>
                                            <dd>
                                                <div className="text-lg font-medium text-gray-900">
                                                    Продажа и управление
                                                </div>
                                            </dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-5 py-3">
                                <div className="text-sm">
                                    <button
                                        onClick={() => router.push('/admin/packages')}
                                        className="font-medium text-indigo-600 hover:text-indigo-500"
                                    >
                                        Перейти к пакетам
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
