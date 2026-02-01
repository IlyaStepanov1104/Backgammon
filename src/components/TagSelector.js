'use client';

import { useState, useEffect } from 'react';

export default function TagSelector({ selectedTagIds = [], onSelectionChange, onClose }) {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState(selectedTagIds);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  useEffect(() => {
    fetchTags();
  }, []);

  useEffect(() => {
    setSelectedTags(selectedTagIds);
  }, [selectedTagIds]);

  const fetchTags = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/tags');

      if (!response.ok) {
        throw new Error('Failed to fetch tags');
      }

      const data = await response.json();
      setTags(data.tags || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTagToggle = (tagId) => {
    const newSelection = selectedTags.includes(tagId)
      ? selectedTags.filter(id => id !== tagId)
      : [...selectedTags, tagId];

    setSelectedTags(newSelection);
  };

  const handleConfirm = () => {
    onSelectionChange(selectedTags);
    onClose();
  };

  const handleAddTag = async () => {
    if (!newTagName.trim()) return;

    try {
      const response = await fetch('/api/admin/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newTagName.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        // Добавляем новую метку в список
        setTags(prev => [...prev, { id: data.tagId, name: newTagName.trim() }]);
        // Автоматически выбираем новую метку
        setSelectedTags(prev => [...prev, data.tagId]);
        setNewTagName('');
        setShowAddForm(false);
      } else {
        const data = await response.json();
        setError(data.error || 'Ошибка создания метки');
      }
    } catch (error) {
      setError('Ошибка соединения с сервером');
    }
  };

  const filteredTags = tags.filter(tag =>
    tag.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-8 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            Ошибка загрузки меток: {error}
          </div>
          <button
            onClick={onClose}
            className="mt-4 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
          >
            Закрыть
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Выбор меток</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Поиск */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Поиск по названию метки..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Добавление новой метки */}
        <div className="mb-4">
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium"
            >
              + Добавить новую метку
            </button>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Название новой метки..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddTag}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                >
                  Добавить
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewTagName('');
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Счетчик выбранных */}
        <div className="mb-4 text-sm text-gray-600">
          Выбрано меток: {selectedTags.length}
        </div>

        {/* Список меток */}
        <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md">
          {filteredTags.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              Метки не найдены
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredTags.map((tag) => (
                <div
                  key={tag.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer ${
                    selectedTags.includes(tag.id) ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                  onClick={() => handleTagToggle(tag.id)}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedTags.includes(tag.id)}
                      onChange={() => handleTagToggle(tag.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-gray-400">#{tag.id}</span>
                      <span className="font-medium text-gray-900">{tag.name}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Кнопки */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleConfirm}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Подтвердить выбор ({selectedTags.length})
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}