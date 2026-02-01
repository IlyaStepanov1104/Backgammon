'use client';

import {useState, useEffect} from 'react';
import {useRouter} from 'next/navigation';
import Modal from '../../../components/Modal';

export default function GroupsPage() {
    const [groups, setGroups] = useState([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showMembersModal, setShowMembersModal] = useState(false);
    const [groupMembers, setGroupMembers] = useState([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [showAddUsersModal, setShowAddUsersModal] = useState(false);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [newGroup, setNewGroup] = useState({name: '', description: ''});
    const [editGroup, setEditGroup] = useState({id: '', name: '', description: ''});
    const [error, setError] = useState('');
    const router = useRouter();

    useEffect(() => {
        const auth = localStorage.getItem('adminAuth');
        if (!auth) {
            router.push('/admin');
            return;
        }
        fetchGroups();
    }, [pagination.page, pagination.limit, searchTerm, router]);

    const fetchGroups = async () => {
        try {
            const params = new URLSearchParams({
                page: pagination.page,
                limit: pagination.limit,
                search: searchTerm
            });

            const response = await fetch(`/api/admin/groups?${params}`);
            if (response.ok) {
                const data = await response.json();
                setGroups(data.groups);
                setPagination(data.pagination);
            } else {
                console.error('Failed to fetch groups');
            }
        } catch (error) {
            console.error('Error fetching groups:', error);
        }
    };

    const fetchGroupMembers = async (groupId) => {
        try {
            setLoadingMembers(true);
            const response = await fetch(`/api/admin/groups/${groupId}/members`);
            if (response.ok) {
                const data = await response.json();
                setGroupMembers(data.members);
                setShowMembersModal(true);
            } else {
                console.error('Failed to fetch members');
            }
        } catch (error) {
            console.error('Error fetching members:', error);
        } finally {
            setLoadingMembers(false);
        }
    };

    const fetchAvailableUsers = async (groupId) => {
        try {
            // Получаем всех пользователей
            const usersResponse = await fetch('/api/admin/users?limit=1000');
            if (!usersResponse.ok) return;

            const usersData = await usersResponse.json();

            // Получаем текущих участников группы
            const membersResponse = await fetch(`/api/admin/groups/${groupId}/members`);
            let currentMembers = [];
            if (membersResponse.ok) {
                const membersData = await membersResponse.json();
                currentMembers = membersData.members.map(member => member.id);
            }

            // Отмечаем пользователей, которые уже в группе
            const usersWithStatus = usersData.users.map(user => ({
                ...user,
                isInGroup: currentMembers.includes(user.id)
            }));

            setAvailableUsers(usersWithStatus);
            // Автоматически отмечаем уже добавленных пользователей
            setSelectedUserIds(currentMembers);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const handleCreateGroup = async () => {
        if (!newGroup.name.trim()) {
            setError('Название группы обязательно');
            return;
        }

        try {
            const response = await fetch('/api/admin/groups', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(newGroup)
            });

            if (response.ok) {
                setShowCreateModal(false);
                setNewGroup({name: '', description: ''});
                setError('');
                fetchGroups();
            } else {
                const data = await response.json();
                setError(data.error || 'Ошибка при создании группы');
            }
        } catch (error) {
            console.error('Error creating group:', error);
            setError('Ошибка соединения с сервером');
        }
    };

    const handleEditGroup = async () => {
        if (!editGroup.name.trim()) {
            setError('Название группы обязательно');
            return;
        }

        try {
            const response = await fetch('/api/admin/groups', {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(editGroup)
            });

            if (response.ok) {
                setShowEditModal(false);
                setEditGroup({id: '', name: '', description: ''});
                setError('');
                fetchGroups();
            } else {
                const data = await response.json();
                setError(data.error || 'Ошибка при обновлении группы');
            }
        } catch (error) {
            console.error('Error updating group:', error);
            setError('Ошибка соединения с сервером');
        }
    };

    const handleDeleteGroup = async (groupId) => {
        if (!confirm('Вы уверены, что хотите удалить эту группу?')) return;

        try {
            const response = await fetch(`/api/admin/groups?groupId=${groupId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                fetchGroups();
            } else {
                console.error('Failed to delete group');
            }
        } catch (error) {
            console.error('Error deleting group:', error);
        }
    };

    const handleAddUsersToGroup = async () => {
        if (!selectedGroup || selectedUserIds.length === 0) return;

        try {
            const response = await fetch(`/api/admin/groups/${selectedGroup.id}/members`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({userIds: selectedUserIds})
            });

            if (response.ok) {
                const data = await response.json();
                alert(data.message);
                setShowAddUsersModal(false);
                setSelectedUserIds([]);
                fetchGroups(); // Обновляем счетчик участников
                if (showMembersModal) {
                    fetchGroupMembers(selectedGroup.id);
                }
            } else {
                const data = await response.json();
                setError(data.error || 'Ошибка при добавлении пользователей');
            }
        } catch (error) {
            console.error('Error adding users:', error);
            setError('Ошибка соединения с сервером');
        }
    };

    const handleRemoveUserFromGroup = async (groupId, userId) => {
        try {
            const response = await fetch(`/api/admin/groups/${groupId}/members?userId=${userId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                fetchGroupMembers(groupId);
                fetchGroups(); // Обновляем счетчик участников
            } else {
                console.error('Failed to remove user');
            }
        } catch (error) {
            console.error('Error removing user:', error);
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
                            Управление группами пользователей
                        </h1>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                            >
                                Создать группу
                            </button>
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

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    {/* Фильтры */}
                    <div className="bg-white p-6 rounded-lg shadow mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Поиск
                                </label>
                                <input
                                    type="text"
                                    placeholder="Название группы..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div className="flex items-end">
                                <button
                                    onClick={() => {
                                        setSearchTerm('');
                                        setPagination(prev => ({...prev, page: 1}));
                                    }}
                                    className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-3 rounded-md text-sm font-medium"
                                >
                                    Сбросить
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Таблица групп */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Название группы
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Описание
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Участников
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Дата создания
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Действия
                                    </th>
                                </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                {groups.map((group) => (
                                    <tr key={group.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {group.name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 max-w-xs truncate">
                                                {group.description || 'Без описания'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            <button
                                                onClick={() => {
                                                    setSelectedGroup(group);
                                                    fetchGroupMembers(group.id);
                                                }}
                                                className="text-blue-600 hover:text-blue-900 underline"
                                            >
                                                {group.member_count} участников
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatDateTime(group.created_at)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                            <button
                                                onClick={() => {
                                                    setSelectedGroup(group);
                                                    setEditGroup({id: group.id, name: group.name, description: group.description || ''});
                                                    setShowEditModal(true);
                                                }}
                                                className="text-indigo-600 hover:text-indigo-900"
                                            >
                                                Редактировать
                                            </button>
                                            <button
                                                onClick={() => handleDeleteGroup(group.id)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                Удалить
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

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

                    {/* Модальное окно создания группы */}
                    <Modal
                        isOpen={showCreateModal}
                        onClose={() => {
                            setShowCreateModal(false);
                            setNewGroup({name: '', description: ''});
                            setError('');
                        }}
                        title="Создать новую группу"
                        maxWidth="sm:max-w-md"
                        footer={
                            <>
                                <button
                                    onClick={handleCreateGroup}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    Создать
                                </button>
                                <button
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setNewGroup({name: '', description: ''});
                                        setError('');
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
                            <label className="block text-sm font-medium mb-2">Название группы *</label>
                            <input
                                type="text"
                                value={newGroup.name}
                                onChange={(e) => setNewGroup(prev => ({...prev, name: e.target.value}))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Введите название группы"
                                required
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Описание</label>
                            <textarea
                                value={newGroup.description}
                                onChange={(e) => setNewGroup(prev => ({...prev, description: e.target.value}))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Введите описание группы"
                                rows={3}
                            />
                        </div>
                    </Modal>

                    {/* Модальное окно редактирования группы */}
                    <Modal
                        isOpen={showEditModal}
                        onClose={() => {
                            setShowEditModal(false);
                            setEditGroup({id: '', name: '', description: ''});
                            setError('');
                        }}
                        title="Редактировать группу"
                        maxWidth="sm:max-w-md"
                        footer={
                            <>
                                <button
                                    onClick={handleEditGroup}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    Сохранить
                                </button>
                                <button
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setEditGroup({id: '', name: '', description: ''});
                                        setError('');
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
                            <label className="block text-sm font-medium mb-2">Название группы *</label>
                            <input
                                type="text"
                                value={editGroup.name}
                                onChange={(e) => setEditGroup(prev => ({...prev, name: e.target.value}))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Введите название группы"
                                required
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Описание</label>
                            <textarea
                                value={editGroup.description}
                                onChange={(e) => setEditGroup(prev => ({...prev, description: e.target.value}))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Введите описание группы"
                                rows={3}
                            />
                        </div>
                    </Modal>

                    {/* Модальное окно участников группы */}
                    <Modal
                        isOpen={showMembersModal && !!selectedGroup}
                        onClose={() => {
                            setShowMembersModal(false);
                            setSelectedGroup(null);
                            setGroupMembers([]);
                        }}
                        title={`Участники группы "${selectedGroup?.name}"`}
                        maxWidth="sm:max-w-4xl"
                        footer={
                            <>
                                <button
                                    onClick={() => {
                                        fetchAvailableUsers(selectedGroup.id);
                                        setShowAddUsersModal(true);
                                    }}
                                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                    Добавить участников
                                </button>
                                <button
                                    onClick={() => {
                                        setShowMembersModal(false);
                                        setSelectedGroup(null);
                                        setGroupMembers([]);
                                    }}
                                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                                >
                                    Закрыть
                                </button>
                            </>
                        }
                    >
                        {loadingMembers ? (
                            <div className="text-center py-8">Загрузка...</div>
                        ) : groupMembers.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                В группе нет участников
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {groupMembers.map((member) => (
                                    <div
                                        key={member.id}
                                        className="border rounded-lg p-4 flex items-center justify-between hover:bg-gray-50"
                                    >
                                        <div className="flex items-center space-x-4">
                                            <div>
                                                <div className="font-medium text-gray-900">
                                                    {member.first_name} {member.last_name}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    @{member.username} • ID: {member.telegram_id}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    Добавлен: {formatDateTime(member.joined_at)}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveUserFromGroup(selectedGroup.id, member.id)}
                                            className="text-red-600 hover:text-red-900 px-3 py-2 rounded hover:bg-red-50"
                                            title="Удалить из группы"
                                        >
                                            Удалить
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Modal>

                    {/* Модальное окно добавления пользователей */}
                    <Modal
                        isOpen={showAddUsersModal && !!selectedGroup}
                        onClose={() => {
                            setShowAddUsersModal(false);
                            setSelectedUserIds([]);
                            setError('');
                        }}
                        title={`Добавить участников в группу "${selectedGroup?.name}"`}
                        maxWidth="sm:max-w-2xl"
                        footer={
                            <>
                                <button
                                    onClick={handleAddUsersToGroup}
                                    disabled={selectedUserIds.length === 0}
                                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                                >
                                    Добавить ({selectedUserIds.length})
                                </button>
                                <button
                                    onClick={() => {
                                        setShowAddUsersModal(false);
                                        setSelectedUserIds([]);
                                        setError('');
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
                            <div className="max-h-60 overflow-y-auto border rounded p-4">
                                {availableUsers.length === 0 ? (
                                    <div className="text-center py-4 text-gray-500">Загрузка пользователей...</div>
                                ) : (
                                    availableUsers.map((user) => (
                                        <label key={user.id} className={`flex items-center space-x-3 p-2 hover:bg-gray-50 rounded ${user.isInGroup ? 'bg-green-50' : ''}`}>
                                            <input
                                                type="checkbox"
                                                checked={selectedUserIds.includes(user.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedUserIds(prev => [...prev, user.id]);
                                                    } else {
                                                        setSelectedUserIds(prev => prev.filter(id => id !== user.id));
                                                    }
                                                }}
                                                className="rounded"
                                                disabled={user.isInGroup}
                                            />
                                            <div>
                                                <div className={`font-medium ${user.isInGroup ? 'text-green-700' : ''}`}>
                                                    {user.first_name} {user.last_name} {user.isInGroup && '(уже в группе)'}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    @{user.username} • ID: {user.telegram_id}
                                                </div>
                                            </div>
                                        </label>
                                    ))
                                )}
                            </div>
                        </div>
                    </Modal>
                </div>
            </main>
        </div>
    );
}