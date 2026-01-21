'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getUserFromToken, validateAuth, getValidToken } from '@/utils/auth';

interface EntityRecord {
  [key: string]: any;
}

interface ReferenceData {
  [key: string]: { id: number; name: string }[];
}

const EntityEditPage = () => {
  const router = useRouter();
  const params = useParams<{ entity: string; id: string }>();
  const entity = params.entity;
  const recordId = params.id;
  
  const [record, setRecord] = useState<EntityRecord | null>(null);
  const [formData, setFormData] = useState<EntityRecord>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [referenceData, setReferenceData] = useState<ReferenceData>({});

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

    if (entity && recordId) {
      fetchRecord();
    }
  }, [entity, recordId, router]);

  const fetchRecord = async () => {
    try {
      setLoading(true);
      const validToken = getValidToken();
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin-tables/${entity}/${recordId}`, {
        headers: {
          'Authorization': `Bearer ${validToken?.token || ''}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch record: ${response.statusText}`);
      }
      
      const data = await response.json();
      setRecord(data);
      setFormData({ ...data });
      
      // Fetch reference data
      await fetchReferenceData();
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching the record');
      console.error('Error fetching record:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferenceData = async () => {
    try {
      const validToken = getValidToken();
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin-tables/${entity}/${recordId}/references`, {
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

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validToken = getValidToken();
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin-tables/${entity}/${recordId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken?.token || ''}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update record');
      }

      // Redirect back to the entity list
      router.push(`/admin-dashboard/manage-tables/${entity}`);
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating the record');
      console.error('Error updating record:', err);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (loading) {
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

  if (!record) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded max-w-md">
          <p>Record not found</p>
          <button
            onClick={() => router.push(`/admin-dashboard/manage-tables/${entity}`)}
            className="mt-2 text-sm underline text-yellow-700"
          >
            Go back to {getEntityDisplayName(entity)} list
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Edit {getEntityDisplayName(entity)}
            </h1>
          </div>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <p>{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {Object.keys(formData).map((field) => {
                if (field === getPrimaryKeyField(entity) || 
                    field === 'RecordCreationTimeStamp' || 
                    field === 'RecordCreationLogin' || 
                    field === 'LastUpdationTimeStamp' || 
                    field === 'LastUpdationLogin' || 
                    field === 'IsDeleted') {
                  return null; // Skip primary key and audit fields
                }

                const referenceField = getReferenceFields(entity)[field];
                
                return (
                  <div key={field} className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.replace(/([A-Z])/g, ' $1').trim()}:
                    </label>
                    
                    {referenceField && referenceData[referenceField] ? (
                      <select
                        value={formData[field] || ''}
                        onChange={(e) => handleFieldChange(field, e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Select {referenceField}</option>
                        {referenceData[referenceField].map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.toLowerCase().includes('date') ? 'date' : 
                              field.toLowerCase().includes('timestamp') ? 'datetime-local' :
                              field.toLowerCase().includes('email') ? 'email' :
                              field.toLowerCase().includes('mobile') || field.toLowerCase().includes('phone') ? 'tel' :
                              field.toLowerCase().includes('password') ? 'password' :
                              field.toLowerCase().includes('url') ? 'url' :
                              field.toLowerCase().includes('price') || field.toLowerCase().includes('amount') || field.toLowerCase().includes('mrp') || field.toLowerCase().includes('gst') || field.toLowerCase().includes('discount') ? 'number' :
                              'text'}
                        value={formData[field] || ''}
                        onChange={(e) => handleFieldChange(field, e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        placeholder={`Enter ${field.replace(/([A-Z])/g, ' $1').trim()}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="flex space-x-4 mt-8">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Update
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EntityEditPage;