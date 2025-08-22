'use client';

import { useState } from 'react';
import { useBulkPromocodes } from '../hooks/usePromocodes';
import { generatePromocode, createPromocodeBatch } from '../utils/promocodes';
import CardSelector from './CardSelector';

export default function BulkPromocodes({ onSuccess }) {
  const [showModal, setShowModal] = useState(false);
  const [operation, setOperation] = useState('create'); // create, delete, update
  const [showCardSelector, setShowCardSelector] = useState(false);
  const [formData, setFormData] = useState({
    count: 10,
    prefix: 'PROMO',
    length: 8,
    description: '',
    maxUses: 1,
    cardIds: [],
    expiresAt: '',
    isActive: true
  });

  const { bulkCreate, bulkDelete, bulkUpdate, loading, error, success, reset } = useBulkPromocodes();

  const handleBulkCreate = async () => {
    try {
      const template = {
        prefix: formData.prefix,
        length: formData.length,
        description: formData.description,
        maxUses: formData.maxUses,
        cardIds: formData.cardIds,
        expiresAt: formData.expiresAt || null,
        isActive: formData.isActive
      };

      const promocodes = createPromocodeBatch(template, formData.count);
      await bulkCreate(promocodes, template);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating bulk promocodes:', error);
    }
  };

  const handleBulkDelete = async (ids) => {
    if (window.confirm(`Вы уверены, что хотите удалить ${ids.length} промокодов?`)) {
      try {
        await bulkDelete(ids);
        if (onSuccess) {
          onSuccess();
        }
      } catch (error) {
        console.error('Error deleting bulk promocodes:', error);
      }
    }
  };

  const handleBulkUpdate = async (ids, updates) => {
    try {
      await bulkUpdate(ids, updates);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error updating bulk promocodes:', error);
    }
  };

  const handleCardSelection = (selectedCardIds) => {
    setFormData(prev => ({ ...prev, cardIds: selectedCardIds }));
  };

  const resetForm = () => {
    setFormData({
      count: 10,
      prefix: 'PROMO',
      length: 8,
      description: '',
      maxUses: 1,
      cardPackageSize: 10,
      expiresAt: '',
      isActive: true
    });
  };

  if (success) {
    reset();
    setShowModal(false);
    resetForm();
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
      >
        <span>⚡</span>
        Массовые операции
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Массовые операции с промокодами</h3>
              
              {/* Переключение операций */}
              <div className="mb-4">
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setOperation('create')}
                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-md ${
                      operation === 'create' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Создание
                  </button>
                  <button
                    onClick={() => setOperation('delete')}
                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-md ${
                      operation === 'delete' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Удаление
                  </button>
                  <button
                    onClick={() => setOperation('update')}
                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-md ${
                      operation === 'update' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Обновление
                  </button>
                </div>
              </div>

              {/* Форма создания */}
              {operation === 'create' && (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleBulkCreate();
                }}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Количество промокодов *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="100"
                      value={formData.count}
                      onChange={(e) => setFormData(prev => ({ ...prev, count: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Префикс
                      </label>
                      <input
                        type="text"
                        value={formData.prefix}
                        onChange={(e) => setFormData(prev => ({ ...prev, prefix: e.target.value.toUpperCase() }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Длина
                      </label>
                      <input
                        type="number"
                        min="6"
                        max="20"
                        value={formData.length}
                        onChange={(e) => setFormData(prev => ({ ...prev, length: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Описание
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      rows="2"
                      placeholder="Описание для всех промокодов..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Максимум использований
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.maxUses}
                        onChange={(e) => setFormData(prev => ({ ...prev, maxUses: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                                       <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       Выбрать карточки
                     </label>
                     <button
                       type="button"
                       onClick={() => setShowCardSelector(true)}
                       className="w-full px-3 py-2 border border-gray-300 rounded-md text-left text-gray-500 hover:border-blue-500"
                     >
                       {formData.cardIds.length > 0 ? `${formData.cardIds.length} карточек выбрано` : 'Нажмите для выбора карточек'}
                     </button>
                   </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Дата истечения
                    </label>
                    <input
                      type="date"
                      value={formData.expiresAt}
                      onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="mb-6">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Активны по умолчанию</span>
                    </label>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
                    >
                      {loading ? 'Создание...' : `Создать ${formData.count} промокодов`}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        resetForm();
                      }}
                      className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
                    >
                      Отмена
                    </button>
                  </div>
                </form>
              )}

              {/* Форма удаления */}
              {operation === 'delete' && (
                <div>
                  <p className="text-gray-600 mb-4">
                    Для массового удаления промокодов используйте API endpoint:
                  </p>
                  <code className="block bg-gray-100 p-3 rounded text-sm mb-4">
                    POST /api/admin/promocodes/bulk
                  </code>
                  <p className="text-sm text-gray-500 mb-4">
                    Отправьте массив ID промокодов для удаления.
                  </p>
                  <button
                    onClick={() => setShowModal(false)}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
                  >
                    Закрыть
                  </button>
                </div>
              )}

              {/* Форма обновления */}
              {operation === 'update' && (
                <div>
                  <p className="text-gray-600 mb-4">
                    Для массового обновления промокодов используйте API endpoint:
                  </p>
                  <code className="block bg-gray-100 p-3 rounded text-sm mb-4">
                    PATCH /api/admin/promocodes/bulk
                  </code>
                  <p className="text-sm text-gray-500 mb-4">
                    Отправьте массив ID и объект с полями для обновления.
                  </p>
                  <button
                    onClick={() => setShowModal(false)}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
                  >
                    Закрыть
                  </button>
                </div>
              )}

              {/* Ошибки */}
              {error && (
                <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
               )}

         {/* Селектор карточек */}
         {showCardSelector && (
           <CardSelector
             selectedCardIds={formData.cardIds}
             onSelectionChange={handleCardSelection}
             onClose={() => setShowCardSelector(false)}
           />
         )}
       </>
     );
   }
