'use client';

import { useState, useEffect, useCallback } from 'react';

// Хук для получения списка промокодов
export function usePromocodes(options = {}) {
  const [promocodes, setPromocodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  const {
    page = 1,
    limit = 20,
    search = '',
    status = '',
    autoFetch = true
  } = options;

  const fetchPromocodes = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams({
        page: params.page || page,
        limit: params.limit || limit,
        ...(params.search !== undefined && { search: params.search }),
        ...(params.status !== undefined && { status: params.status })
      });

      const response = await fetch(`/api/admin/promocodes?${searchParams}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setPromocodes(data.promocodes);
        setPagination(data.pagination);
      } else {
        throw new Error(data.error || 'Failed to fetch promocodes');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching promocodes:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  const refetch = useCallback(() => {
    fetchPromocodes();
  }, [fetchPromocodes]);

  useEffect(() => {
    if (autoFetch) {
      fetchPromocodes();
    }
  }, [fetchPromocodes, autoFetch]);

  return {
    promocodes,
    loading,
    error,
    pagination,
    fetchPromocodes,
    refetch
  };
}

// Хук для создания промокода
export function useCreatePromocode() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const createPromocode = useCallback(async (promocodeData) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/admin/promocodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(promocodeData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create promocode');
      }

      setSuccess(true);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setSuccess(false);
  }, []);

  return {
    createPromocode,
    loading,
    error,
    success,
    reset
  };
}

// Хук для обновления промокода
export function useUpdatePromocode() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const updatePromocode = useCallback(async (promocodeData) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/admin/promocodes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(promocodeData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update promocode');
      }

      setSuccess(true);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setSuccess(false);
  }, []);

  return {
    updatePromocode,
    loading,
    error,
    success,
    reset
  };
}

// Хук для удаления промокода
export function useDeletePromocode() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const deletePromocode = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/admin/promocodes?id=${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete promocode');
      }

      setSuccess(true);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setSuccess(false);
  }, []);

  return {
    deletePromocode,
    loading,
    error,
    success,
    reset
  };
}

// Хук для массовых операций
export function useBulkPromocodes() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const bulkCreate = useCallback(async (promocodes, template) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/admin/promocodes/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ promocodes, template })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create promocodes');
      }

      setSuccess(true);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const bulkDelete = useCallback(async (ids) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/admin/promocodes/bulk', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete promocodes');
      }

      setSuccess(true);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const bulkUpdate = useCallback(async (ids, updates) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/admin/promocodes/bulk', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids, updates })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update promocodes');
      }

      setSuccess(true);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setSuccess(false);
  }, []);

  return {
    bulkCreate,
    bulkDelete,
    bulkUpdate,
    loading,
    error,
    success,
    reset
  };
}

// Хук для валидации промокода
export function useValidatePromocode() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationResult, setValidationResult] = useState(null);

  const validatePromocode = useCallback(async (code) => {
    setLoading(true);
    setError(null);
    setValidationResult(null);

    try {
      const response = await fetch('/api/admin/promocodes/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Validation failed');
      }

      setValidationResult(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkAvailability = useCallback(async (code) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/promocodes/validate?code=${encodeURIComponent(code)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setValidationResult(null);
  }, []);

  return {
    validatePromocode,
    checkAvailability,
    loading,
    error,
    validationResult,
    reset
  };
}

// Хук для экспорта промокодов
export function useExportPromocodes() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const exportPromocodes = useCallback(async (options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams({
        format: options.format || 'json',
        ...(options.status && { status: options.status }),
        ...(options.dateFrom && { dateFrom: options.dateFrom }),
        ...(options.dateTo && { dateTo: options.dateTo })
      });

      const response = await fetch(`/api/admin/promocodes/export?${searchParams}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Export failed');
      }

      if (options.format === 'csv') {
        // Скачиваем CSV файл
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'promocodes.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // Возвращаем JSON данные
        const data = await response.json();
        return data;
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    exportPromocodes,
    loading,
    error
  };
}
