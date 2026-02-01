import { useState, useEffect } from 'react';

// Hook для получения списка пакетов
export function usePackages({ autoFetch = true, page = 1, limit = 20, search = '', status = '' } = {}) {
  const [packages, setPackages] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPackages = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(status && { status })
      });

      const response = await fetch(`/api/admin/packages?${params}`);
      const data = await response.json();

      if (data.success) {
        setPackages(data.packages);
        setPagination(data.pagination);
      } else {
        setError(data.error || 'Failed to fetch packages');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch) {
      fetchPackages();
    }
  }, [page, limit, search, status, autoFetch]);

  return { packages, pagination, loading, error, fetchPackages };
}

// Hook для получения деталей пакета
export function usePackage(id) {
  const [packageData, setPackageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPackage = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/packages/${id}`);
      const data = await response.json();

      if (data.success) {
        setPackageData(data.package);
      } else {
        setError(data.error || 'Failed to fetch package');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackage();
  }, [id]);

  return { packageData, loading, error, fetchPackage };
}

// Hook для создания пакета
export function useCreatePackage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createPackage = async (packageData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(packageData)
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create package');
      }

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createPackage, loading, error };
}

// Hook для обновления пакета
export function useUpdatePackage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updatePackage = async (packageData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/packages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(packageData)
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update package');
      }

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { updatePackage, loading, error };
}

// Hook для удаления пакета
export function useDeletePackage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const deletePackage = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/packages?id=${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete package');
      }

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { deletePackage, loading, error };
}
