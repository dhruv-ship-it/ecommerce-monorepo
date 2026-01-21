'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getUserFromToken, validateAuth, getValidToken } from '@/utils/auth';

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface EntityRecord {
  [key: string]: any;
}

interface ReferenceData {
  [key: string]: { id: number; name: string }[];
}

// Helper function to get display value for a field
const getDisplayValue = (record: EntityRecord, field: string): string => {
  // Check if there's a human-readable name version of this field
  const nameField = `${field.replace(/Id$/, '')}_Name`;
  
  // If the name field exists and has a meaningful value, use it
  if (nameField in record && record[nameField] && !record[nameField].startsWith('(ID:') && record[nameField] !== '(Not Set)') {
    return record[nameField];
  }
  
  // Otherwise, return the original value
  return String(record[field]);
};

const EntityManagementPage = () => {
  const router = useRouter();
  const params = useParams<{ entity: string }>();
  const entity = params.entity;
  
  const [records, setRecords] = useState<EntityRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<EntityRecord | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<EntityRecord>({});
  const [referenceData, setReferenceData] = useState<ReferenceData>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

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

  // Get reference fields for the entity
  const getReferenceFields = (entityId: string): Record<string, string> => {
    const refs: Record<string, Record<string, string>> = {
      'product': {
        'ProductCategory_Gen': 'productcategory',
        'ProductSubCategory': 'productsubcategory',
        'Model': 'model',
        'Unit': 'unit',
        'Currency': 'currency',
        'Color': 'color',
        'Size': 'size',
        'Shape': 'shape'
      },
      'model': {
        'Brand': 'brand',
        'Material': 'material'
      },
      'brand': {
        'Company': 'company'
      },
      'company': {
        'Locality': 'locality'
      },
      'country': {
        'Continent': 'continent'
      },
      'state': {
        'Country': 'country'
      },
      'district': {
        'State': 'state'
      },
      'locality': {
        'District': 'district'
      },
      'productsubcategory': {
        'ProductCategory': 'productcategory'
      }
    };
    return refs[entityId.toLowerCase()] || {};
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
      fetchRecords(currentPage);
    }
  }, [entity, currentPage]);

  const fetchRecords = async (page: number) => {
    try {
      setLoading(true);
      
      // Check if user is admin before making request
      const user = getUserFromToken();
      if (!user || user.userType !== 'user' || user.role !== 'admin') {
        throw new Error('Access denied. Admin only.');
      }
      
      const validToken = getValidToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin-tables/${entity}?page=${page}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${validToken?.token || ''}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ${entity} records: ${response.statusText}`);
      }
      
      const data = await response.json();
      setRecords(data.records);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching records');
      console.error('Error fetching records:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferenceData = async (recordId?: number) => {
    try {
      let url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/admin-tables/${entity}/references`;
      if (recordId) {
        url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/admin-tables/${entity}/${recordId}/references`;
      }
      
      const validToken = getValidToken();
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${validToken?.token || ''}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch reference data: ${response.statusText}`);
      }
      
      const data = await response.json();
      setReferenceData(data);
    } catch (err: any) {
      console.error('Error fetching reference data:', err);
    }
  };

  const fetchRecordById = async (id: number) => {
    try {
      const validToken = getValidToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin-tables/${entity}/${id}`, {
        headers: {
          'Authorization': `Bearer ${validToken?.token || ''}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch record: ${response.statusText}`);
      }
      
      const record = await response.json();
      return record;
    } catch (err: any) {
      console.error('Error fetching record:', err);
      throw err;
    }
  };

  const handleEdit = async (id: number) => {
    try {
      // Navigate to the edit page
      router.push(`/admin-dashboard/manage-tables/${entity}/${id}`);
    } catch (err) {
      setError('Failed to load record for editing');
      console.error('Error loading record for edit:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this record?')) {
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
        throw new Error(`Failed to delete record: ${response.statusText}`);
      }

      // Refresh records
      fetchRecords(currentPage);
    } catch (err: any) {
      setError(err.message || 'An error occurred while deleting the record');
      console.error('Error deleting record:', err);
    }
  };

  const handleSave = async () => {
    try {
      const validToken = getValidToken();
      const method = editingRecord ? 'PUT' : 'POST';
      const url = editingRecord 
        ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/admin-tables/${entity}/${editingRecord[getPrimaryKeyField(entity)]}`
        : `${process.env.NEXT_PUBLIC_BACKEND_URL}/admin-tables/${entity}`;
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken?.token || ''}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingRecord ? 'update' : 'create'} record`);
      }

      const savedRecord = await response.json();
      
      // Close form and refresh records
      setShowForm(false);
      setEditingRecord(null);
      setFormData({});
      fetchRecords(currentPage);
    } catch (err: any) {
      setError(err.message || `An error occurred while ${editingRecord ? 'updating' : 'creating'} the record`);
      console.error(`Error ${editingRecord ? 'updating' : 'creating'} record:`, err);
    }
  };

  const handleAddNew = async () => {
    // Navigate to the new entry page
    router.push(`/admin-dashboard/manage-tables/${entity}/new`);
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const filteredRecords = records.filter(record => {
    if (!searchTerm) return true;
    
    // Search in all fields
    return Object.values(record).some(value =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  if (!entity) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md">
          <p>Invalid entity type</p>
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
              Manage {getEntityDisplayName(entity)}
            </h1>
            <div className="space-x-3">
              <button
                onClick={() => router.push(`/admin-dashboard/manage-tables/${entity}/deleted`)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors"
              >
                View Deleted {getEntityDisplayName(entity)}
              </button>
              <button
                onClick={handleAddNew}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
              >
                Add New
              </button>
            </div>
          </div>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <p>{error}</p>
            </div>
          )}
          

          
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
          
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
                        
                        // Skip the generated _Name fields to avoid duplicates in headers
                        if (field.endsWith('_Name')) {
                          return null;
                        }
                        
                        // Format the header text nicely
                        let headerText = field.replace(/([A-Z])/g, ' $1').trim();
                        
                        // If this field has a corresponding _Name field, make the header clearer
                        const nameField = `${field.replace(/Id$/, '')}_Name`;
                        if (nameField in (records[0] || {})) {
                          // If the field ends with Id, replace it with a clearer label
                          if (field.endsWith('Id') && !['Id', 'UserId', 'CustomerId', 'VendorProductCustomerCourierId', 'PurchaseId'].includes(field)) {
                            headerText = field.replace(/Id$/, '');
                          }
                        }
                        
                        return (
                          <th 
                            key={field} 
                            scope="col" 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {headerText}
                          </th>
                        );
                      })}
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredRecords.map((record) => (
                      <tr key={record[getPrimaryKeyField(entity)]}>
                        {Object.entries(record).map(([field, value]) => {
                          if (field === 'RecordCreationTimeStamp' || 
                              field === 'RecordCreationLogin' || 
                              field === 'LastUpdationTimeStamp' || 
                              field === 'LastUpdationLogin' || 
                              field === 'IsDeleted') {
                            return null; // Skip audit fields in table
                          }
                          
                          // Skip the generated _Name fields to avoid duplicates
                          if (field.endsWith('_Name')) {
                            return null;
                          }
                          
                          return (
                            <td key={field} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {getDisplayValue(record, field)}
                            </td>
                          );
                        })}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEdit(record[getPrimaryKeyField(entity)])}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(record[getPrimaryKeyField(entity)])}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
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
                    {pagination.totalRecords} records
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

export default EntityManagementPage;

