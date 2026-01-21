'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getUserFromToken, validateAuth, getValidToken } from '@/utils/auth';

interface EntityRecord {
  [key: string]: any;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const EntityDeletedPage = () => {
  const router = useRouter();
  const params = useParams();
  const entity = params?.entity as string;
  
  const [records, setRecords] = useState<EntityRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Get entity display name
  const getEntityDisplayName = (entityId: string): string => {
    const names: Record<string, string> = {
      'brand': 'Brand',
      'color': 'Color',
      'company': 'Company',
      'continent': 'Continent',
      'country': 'Country',
      'currency': 'Currency',
      'district': 'District',
      'locality': 'Locality',
      'material': 'Material',
      'model': 'Model',
      'product': 'Product',
      'productcategory': 'Product Category',
      'productsubcategory': 'Product Subcategory',
      'shape': 'Shape',
      'size': 'Size',
      'state': 'State',
      'unit': 'Unit',
    };
    return names[entityId.toLowerCase()] || entityId;
  };

  // Get primary key field name for the entity
  const getPrimaryKeyField = (entityId: string): string => {
    const keys: Record<string, string> = {
      'brand': 'BrandId',
      'color': 'ColorId',
      'company': 'CompanyId',
      'continent': 'ContinentId',
      'country': 'CountryId',
      'currency': 'CurrencyId',
      'district': 'DistrictId',
      'locality': 'LocalityId',
      'material': 'MaterialId',
      'model': 'ModelId',
      'product': 'ProductId',
      'productcategory': 'ProductCategoryId',
      'productsubcategory': 'ProductSubCategoryId',
      'shape': 'ShapeId',
      'size': 'SizeId',
      'state': 'StateId',
      'unit': 'UnitId',
    };
    return keys[entityId.toLowerCase()] || 'id';
  };

  useEffect(() => {
    // Validate authentication
    const isValid = validateAuth();
    const user = getUserFromToken();
    
    if (!isValid || !user || user.userType !== 'user' || user.role !== 'admin') {
      router.push('/login');
      return;
    }

    if (entity) {
      fetchDeletedRecords(currentPage);
    }
  }, [entity, currentPage, router]);

  const fetchDeletedRecords = async (page: number) => {
    try {
      setLoading(true);
      const validToken = getValidToken();
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin-tables/${entity}/deleted?page=${page}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${validToken?.token || ''}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch deleted ${entity} records: ${response.statusText}`);
      }
      
      const data = await response.json();
      setRecords(data.records);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching deleted records');
      console.error('Error fetching deleted records:', err);
    } finally {
      setLoading(false);
    }
  };

  const restoreRecord = async (id: number) => {
    if (!confirm('Are you sure you want to restore this record?')) {
      return;
    }

    try {
      const validToken = getValidToken();
      
      // To restore, we need to update the IsDeleted field to 'N'
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin-tables/${entity}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken?.token || ''}`,
        },
        body: JSON.stringify({
          IsDeleted: 'N'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to restore record');
      }

      // Refresh records
      fetchDeletedRecords(currentPage);
    } catch (err: any) {
      setError(err.message || 'An error occurred while restoring the record');
      console.error('Error restoring record:', err);
    }
  };

  const permanentDelete = async (id: number) => {
    if (!confirm('Are you sure you want to permanently delete this record? This cannot be undone.')) {
      return;
    }

    try {
      const validToken = getValidToken();
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin-tables/${entity}/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${validToken?.token || ''}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to permanently delete record');
      }

      // Refresh records
      fetchDeletedRecords(currentPage);
    } catch (err: any) {
      setError(err.message || 'An error occurred while permanently deleting the record');
      console.error('Error permanently deleting record:', err);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md">
          <p>{error}</p>
          <button
            onClick={() => router.push(`/admin-dashboard/manage-tables/${entity}`)}
            className="mt-2 text-sm underline text-red-700"
          >
            Go back to {getEntityDisplayName(entity)} list
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Deleted {getEntityDisplayName(entity)} Records
            </h1>
            <button
              onClick={() => router.push(`/admin-dashboard/manage-tables/${entity}`)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              Back to Active {getEntityDisplayName(entity)}
            </button>
          </div>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <p>{error}</p>
            </div>
          )}
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(records[0] || {}).map((field) => {
                        if (field === 'RecordCreationTimeStamp' || 
                            field === 'RecordCreationLogin' || 
                            field === 'LastUpdationTimeStamp' || 
                            field === 'LastUpdationLogin' || 
                            field === 'IsDeleted') {
                          return null; // Skip audit fields in table
                        }
                        
                        return (
                          <th 
                            key={field} 
                            scope="col" 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {field.replace(/([A-Z])/g, ' $1').trim()}
                          </th>
                        );
                      })}
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {records.map((record) => (
                      <tr key={record[getPrimaryKeyField(entity)]}>
                        {Object.entries(record).map(([field, value]) => {
                          if (field === 'RecordCreationTimeStamp' || 
                              field === 'RecordCreationLogin' || 
                              field === 'LastUpdationTimeStamp' || 
                              field === 'LastUpdationLogin' || 
                              field === 'IsDeleted') {
                            return null; // Skip audit fields in table
                          }
                          
                          return (
                            <td key={field} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {String(value)}
                            </td>
                          );
                        })}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => restoreRecord(record[getPrimaryKeyField(entity)])}
                            className="text-green-600 hover:text-green-900 mr-4"
                          >
                            Restore
                          </button>
                          <button
                            onClick={() => permanentDelete(record[getPrimaryKeyField(entity)])}
                            className="text-red-600 hover:text-red-900"
                          >
                            Permanently Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {pagination && (
                <div className="mt-6 flex justify-between items-center">
                  <div className="text-sm text-gray-700">
                    Showing {((pagination.currentPage - 1) * 10) + 1} to{' '}
                    {Math.min(pagination.currentPage * 10, pagination.totalRecords)} of{' '}
                    {pagination.totalRecords} deleted records
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={!pagination.hasPrev}
                      className={`px-4 py-2 border rounded-md ${
                        pagination.hasPrev 
                          ? 'bg-white text-gray-700 hover:bg-gray-50' 
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Previous
                    </button>
                    
                    <span className="px-4 py-2 text-gray-700">
                      Page {pagination.currentPage} of {pagination.totalPages}
                    </span>
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                      disabled={!pagination.hasNext}
                      className={`px-4 py-2 border rounded-md ${
                        pagination.hasNext 
                          ? 'bg-white text-gray-700 hover:bg-gray-50' 
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EntityDeletedPage;
