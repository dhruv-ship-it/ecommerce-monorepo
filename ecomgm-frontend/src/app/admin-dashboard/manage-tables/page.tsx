'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUserFromToken, validateAuth } from '@/utils/auth';

interface Entity {
  id: string;
  name: string;
  description: string;
}

const ManageTablesPage = () => {
  const router = useRouter();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loadingPage, setLoadingPage] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Validate authentication
    const isValid = validateAuth();
    const user = getUserFromToken();
    
    if (!isValid || !user || user.userType !== 'user' || user.role !== 'admin') {
      router.push('/login');
      return;
    }

    // Define all available entities
    const availableEntities: Entity[] = [
      { id: 'brand', name: 'Brand', description: 'Manage product brands' },
      { id: 'color', name: 'Color', description: 'Manage product colors' },
      { id: 'company', name: 'Company', description: 'Manage companies' },
      { id: 'continent', name: 'Continent', description: 'Manage continents' },
      { id: 'country', name: 'Country', description: 'Manage countries' },
      { id: 'currency', name: 'Currency', description: 'Manage currencies' },
      { id: 'district', name: 'District', description: 'Manage districts' },
      { id: 'locality', name: 'Locality', description: 'Manage localities' },
      { id: 'material', name: 'Material', description: 'Manage materials' },
      { id: 'model', name: 'Model', description: 'Manage product models' },
      { id: 'product', name: 'Product', description: 'Manage products' },
      { id: 'productcategory', name: 'Product Category', description: 'Manage product categories' },
      { id: 'productsubcategory', name: 'Product Subcategory', description: 'Manage product subcategories' },
      { id: 'shape', name: 'Shape', description: 'Manage shapes' },
      { id: 'size', name: 'Size', description: 'Manage sizes' },
      { id: 'state', name: 'State', description: 'Manage states' },
      { id: 'unit', name: 'Unit', description: 'Manage units' },
    ];

    setEntities(availableEntities);
    setLoadingPage(false);
  }, [router]);

  const handleEntityClick = (entityId: string) => {
    router.push(`/admin-dashboard/manage-tables/${entityId}`);
  };

  if (loadingPage) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Manage Database Tables</h1>
          
          <p className="text-gray-600 mb-8">
            Select a table to manage its records. You can view, add, edit, and delete entries in each table.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {entities.map((entity) => (
              <div
                key={entity.id}
                className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer hover:border-blue-300"
                onClick={() => handleEntityClick(entity.id)}
              >
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{entity.name}</h3>
                <p className="text-gray-600">{entity.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageTablesPage;