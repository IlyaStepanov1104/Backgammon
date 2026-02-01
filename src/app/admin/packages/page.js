'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePackages, useCreatePackage, useUpdatePackage, useDeletePackage } from '../../../hooks/usePackages';
import CardSelectorWithRange from '../../../components/CardSelectorWithRange';
import Modal from '../../../components/Modal';

export default function PackagesPage() {
  const [packages, setPackages] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    cardIds: [],
    isActive: true
  });
  const router = useRouter();

  const { packages: apiPackages, fetchPackages } = usePackages({ autoFetch: false });
  const { createPackage } = useCreatePackage();
  const { updatePackage } = useUpdatePackage();
  const { deletePackage } = useDeletePackage();

  useEffect(() => {
    const auth = localStorage.getItem('adminAuth');
    if (!auth) {
      router.push('/admin');
      return;
    }
    fetchPackages();
  }, [router]);

  useEffect(() => {
    if (apiPackages) setPackages(apiPackages);
  }, [apiPackages]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      cardIds: [],
      isActive: true
    });
  };

  const handleCreatePackage = async () => {
    try {
      await createPackage(formData);
      setShowCreateModal(false);
      resetForm();
      fetchPackages();
    } catch (error) {
      alert('Ошибка создания пакета: ' + error.message);
    }
  };

  const handleUpdatePackage = async () => {
    try {
      await updatePackage({ ...formData, id: editingPackage.id });
      setEditingPackage(null);
      resetForm();
      fetchPackages();
    } catch (error) {
      alert('Ошибка обновления пакета: ' + error.message);
    }
  };

  const handleDeletePackage = async (id) => {
    if (window.confirm('Вы уверены, что хотите удалить этот пакет?')) {
      try {
        await deletePackage(id);
        fetchPackages();
      } catch (error) {
        alert('Ошибка удаления пакета: ' + error.message);
      }
    }
  };

  const handleEdit = (pkg) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description || '',
      price: pkg.price,
      cardIds: pkg.cardIds || [],
      isActive: pkg.is_active
    });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Пакеты карточек
            </h1>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Создать пакет
              </button>
              <button
                onClick={() => router.push('/admin')}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
              >
                Назад
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Название
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Цена (₽)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Карточек
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {packages.map((pkg) => (
                  <tr key={pkg.id}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{pkg.name}</div>
                      {pkg.description && (
                        <div className="text-sm text-gray-500 max-w-xs truncate" title={pkg.description}>
                          {pkg.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{pkg.price} ₽</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{pkg.card_count}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        pkg.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {pkg.is_active ? 'Активен' : 'Неактивен'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(pkg)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Изменить
                      </button>
                      <button
                        onClick={() => handleDeletePackage(pkg.id)}
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
      </main>

      {/* Модальное окно создания/редактирования */}
      <Modal
        isOpen={showCreateModal || !!editingPackage}
        onClose={() => {
          setShowCreateModal(false);
          setEditingPackage(null);
          resetForm();
        }}
        title={editingPackage ? 'Редактировать пакет' : 'Создать пакет'}
        footer={
          <>
            <button
              onClick={editingPackage ? handleUpdatePackage : handleCreatePackage}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
            >
              {editingPackage ? 'Сохранить' : 'Создать'}
            </button>
            <button
              onClick={() => {
                setShowCreateModal(false);
                setEditingPackage(null);
                resetForm();
              }}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Отмена
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Название *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              placeholder="Базовый курс"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Описание
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              placeholder="Описание пакета"
              rows="3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Цена (₽) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              placeholder="999.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Карточки *
            </label>
            <CardSelectorWithRange
              selectedCardIds={formData.cardIds}
              onSelectionChange={(cardIds) => setFormData({ ...formData, cardIds })}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">
              Активен
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
