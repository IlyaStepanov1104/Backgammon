'use client';

import {useState, useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {usePromocodes, useCreatePromocode, useUpdatePromocode, useDeletePromocode} from '../../../hooks/usePromocodes';
import {generatePromocode} from '../../../utils/promocodes';
import CardSelectorWithRange from '../../../components/CardSelectorWithRange';

export default function PromocodesPage() {
    const [promocodes, setPromocodes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingPromocode, setEditingPromocode] = useState(null);
    const [formData, setFormData] = useState({
        code: '',
        description: '',
        maxUses: 1,
        cardIds: [],
        expiresAt: '',
        isActive: true
    });

    const router = useRouter();

    const {promocodes: apiPromocodes, fetchPromocodes} = usePromocodes({autoFetch: false});
    const {createPromocode} = useCreatePromocode();
    const {updatePromocode} = useUpdatePromocode();
    const {deletePromocode} = useDeletePromocode();

    useEffect(() => {
        const auth = localStorage.getItem('adminAuth');
        if (!auth) {
            router.push('/admin');
            return;
        }
        fetchPromocodes();
    }, [router]);

    useEffect(() => {
        if (apiPromocodes) setPromocodes(apiPromocodes);
    }, [apiPromocodes]);

    const resetForm = () => {
        setFormData({
            code: '',
            description: '',
            maxUses: 1,
            cardIds: [],
            expiresAt: '',
            isActive: true
        });
    };

    const handleCreatePromocode = async () => {
        await createPromocode(formData);
        setShowCreateModal(false);
        resetForm();
        fetchPromocodes();
    };

    const handleUpdatePromocode = async () => {
        await updatePromocode({...formData, id: editingPromocode.id});
        setEditingPromocode(null);
        resetForm();
        fetchPromocodes();
    };

    const handleDeletePromocode = async (id) => {
        if (window.confirm('Вы уверены, что хотите удалить этот промокод?')) {
            await deletePromocode(id);
            fetchPromocodes();
        }
    };

    const handleEdit = (promocode) => {
        setEditingPromocode(promocode);
        setFormData({
            code: promocode.code,
            description: promocode.description || '',
            maxUses: promocode.max_uses,
            cardIds: [],
            expiresAt: promocode.expires_at ? promocode.expires_at.split('T')[0] : '',
            isActive: promocode.is_active
        });
    };

    const handleGenerateCode = () => {
        const newCode = generatePromocode({prefix: 'PROMO', length: 8});
        setFormData(prev => ({...prev, code: newCode}));
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <h1 className="text-3xl font-bold text-gray-900">
                            Промокоды
                        </h1>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                            >
                                Создать промокод
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
                    <table className="bg-white shadow overflow-hidden sm:rounded-md min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Код</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Описание</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Использования</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Карточек</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
                        </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                        {promocodes.map((promo) => (
                            <tr key={promo.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 font-mono">{promo.code}</td>
                                <td className="px-6 py-4">{promo.description || '-'}</td>
                                <td className="px-6 py-4">{promo.current_uses} / {promo.max_uses}</td>
                                <td className="px-6 py-4">{promo.card_count || 0}</td>
                                <td className="px-6 py-4 space-x-2">
                                    <button onClick={() => handleEdit(promo)}
                                            className="text-blue-600 hover:text-blue-900">Редактировать
                                    </button>
                                    <button onClick={() => handleDeletePromocode(promo.id)}
                                            className="text-red-600 hover:text-red-900"
                                            disabled={promo.current_uses > 0}>Удалить
                                    </button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </main>

            {(showCreateModal || editingPromocode) && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-start pt-20 z-50">
                    <div className="bg-white rounded-md shadow-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-medium mb-4">{editingPromocode ? 'Редактировать промокод' : 'Создать промокод'}</h3>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            editingPromocode ? handleUpdatePromocode() : handleCreatePromocode();
                        }}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Код промокода *</label>
                                <div className="flex gap-2">
                                    <input type="text" required value={formData.code}
                                           onChange={(e) => setFormData(prev => ({
                                               ...prev,
                                               code: e.target.value.toUpperCase()
                                           }))} className="flex-1 px-3 py-2 border rounded-md"/>
                                    <button type="button" onClick={handleGenerateCode}
                                            className="px-3 py-2 bg-gray-600 text-white rounded-md">🎲
                                    </button>
                                </div>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Описание</label>
                                <textarea value={formData.description} onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    description: e.target.value
                                }))} className="w-full px-3 py-2 border rounded-md" rows="3"/>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Максимум использований *</label>
                                <input type="number" required min="1" value={formData.maxUses}
                                       onChange={(e) => setFormData(prev => ({
                                           ...prev,
                                           maxUses: parseInt(e.target.value)
                                       }))} className="w-full px-3 py-2 border rounded-md"/>
                            </div>
                            <div className="mb-4">
                                <CardSelectorWithRange
                                    selectedCardIds={formData.cardIds}
                                    onSelectionChange={(cardIds) => setFormData(prev => ({...prev, cardIds}))}
                                    label="Выбрать карточки"
                                    required={true}
                                />
                            </div>
                            <div className="mb-6">
                                <label className="flex items-center">
                                    <input type="checkbox" checked={formData.isActive}
                                           onChange={(e) => setFormData(prev => ({
                                               ...prev,
                                               isActive: e.target.checked
                                           }))} className="h-4 w-4"/>
                                    <span className="ml-2 text-sm">Активен</span>
                                </label>
                            </div>
                            <div className="flex gap-3">
                                <button type="submit"
                                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md">{editingPromocode ? 'Обновить' : 'Создать'}</button>
                                <button type="button" onClick={() => {
                                    setShowCreateModal(false);
                                    setEditingPromocode(null);
                                    resetForm();
                                }} className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md">Отмена
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
