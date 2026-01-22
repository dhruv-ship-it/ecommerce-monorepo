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

const EntityCreatePage = () => {
  const router = useRouter();
  const params = useParams<{ entity: string }>();
  const entity = params.entity;
  
  const [formData, setFormData] = useState<EntityRecord>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [referenceData, setReferenceData] = useState<ReferenceData>({});
  const [entityStructure, setEntityStructure] = useState<EntityRecord | null>(null);

  // Image upload states
  const [thumbnailImage, setThumbnailImage] = useState<File | null>(null);
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [galleryImages, setGalleryImages] = useState<File[]>([]);
  const [imageUploadProgress, setImageUploadProgress] = useState<{[key: string]: number}>({});

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

  // Fetch entity structure and reference data
  const fetchEntityStructure = async () => {
    try {
      // Validate authentication
      const isValid = validateAuth();
      const user = getUserFromToken();
      
      if (!isValid || !user || user.userType !== 'user' || user.role !== 'admin') {
        router.push('/login');
        return;
      }

      setLoading(true);
      
      const validToken = getValidToken();
      
      // Fetch reference data for dropdowns
      const referenceResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin-tables/${entity}/references`, {
        headers: {
          'Authorization': `Bearer ${validToken?.token || ''}`
        }
      });
      
      if (!referenceResponse.ok) {
        throw new Error(`Failed to fetch reference data: ${referenceResponse.statusText}`);
      }
      
      const referenceData = await referenceResponse.json();
      setReferenceData(referenceData);
      
      // Get field information from the schema in reference data
      if (referenceData.schema) {
        setEntityStructure({ fields: referenceData.schema });
      } else {
        // If schema is not in reference data, try to get it from the structure endpoint
        try {
          const structureResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin-tables/${entity}/structure`, {
            headers: {
              'Authorization': `Bearer ${validToken?.token || ''}`
            }
          });
          
          if (structureResponse.ok) {
            const structureData = await structureResponse.json();
            setEntityStructure(structureData);
          }
        } catch (structureErr) {
          console.warn('Structure endpoint not available, using fallback:', structureErr);
          // As a last resort, try to get a sample record to understand the structure
          try {
            // Get the first record to understand the fields
            const sampleResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin-tables/${entity}?limit=1&page=1`, {
              headers: {
                'Authorization': `Bearer ${validToken?.token || ''}`
              }
            });
            
            if (sampleResponse.ok) {
              const sampleData = await sampleResponse.json();
              if (sampleData.records && sampleData.records.length > 0) {
                // Create a basic schema from the first record
                const basicSchema: { [key: string]: any } = {};
                Object.keys(sampleData.records[0]).forEach(key => {
                  basicSchema[key] = { dataType: 'varchar' }; // Default type
                });
                setEntityStructure({ fields: basicSchema });
              } else {
                // If no records exist, we'll have to create a minimal structure
                setEntityStructure({ fields: {} });
              }
            }
          } catch (sampleErr) {
            console.warn('Sample record approach also failed:', sampleErr);
            setEntityStructure({ fields: {} });
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching entity structure');
      console.error('Error fetching entity structure:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (entity) {
      fetchEntityStructure();
    }
  }, [entity]);

  // Handle form field changes
  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle image file selection
  const handleImageChange = (type: 'thumbnail' | 'main' | 'gallery', file: File | FileList | null) => {
    if (type === 'gallery' && file instanceof FileList) {
      const filesArray = Array.from(file);
      // Limit to 3 gallery images
      setGalleryImages(filesArray.slice(0, 3));
    } else if (file instanceof File) {
      if (type === 'thumbnail') {
        setThumbnailImage(file);
      } else if (type === 'main') {
        setMainImage(file);
      }
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validToken = getValidToken();
      
      // First, create the product record
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin-tables/${entity}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken?.token || ''}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create record');
      }

      const newRecord = await response.json();
      const productId = newRecord[getPrimaryKeyField(entity)];
      
      // If this is a product entity and images were uploaded, upload them
      if (entity === 'product' && productId) {
        await uploadProductImages(productId);
      }

      // Redirect back to the entity list
      router.push(`/admin-dashboard/manage-tables/${entity}`);
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating the record');
      console.error('Error creating record:', err);
    }
  };

  // Upload product images after product creation
  const uploadProductImages = async (productId: number) => {
    const uploadPromises = [];
    
    // Upload thumbnail if selected
    if (thumbnailImage) {
      const formData = new FormData();
      formData.append('image', thumbnailImage);
      formData.append('imageType', 'thumbnail');
      formData.append('productId', productId.toString());
      
      uploadPromises.push(
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/product-images/product/${productId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getValidToken()?.token || ''}`
          },
          body: formData
        })
      );
    }
    
    // Upload main image if selected
    if (mainImage) {
      const formData = new FormData();
      formData.append('image', mainImage);
      formData.append('imageType', 'main');
      formData.append('productId', productId.toString());
      
      uploadPromises.push(
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/product-images/product/${productId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getValidToken()?.token || ''}`
          },
          body: formData
        })
      );
    }
    
    // Upload gallery images if selected
    for (let i = 0; i < galleryImages.length; i++) {
      const formData = new FormData();
      formData.append('image', galleryImages[i]);
      formData.append('imageType', 'gallery');
      formData.append('galleryIndex', (i + 1).toString());
      formData.append('productId', productId.toString());
      formData.append('imageOrder', (i + 1).toString());
      
      uploadPromises.push(
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/product-images/product/${productId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getValidToken()?.token || ''}`
          },
          body: formData
        })
      );
    }
    
    // Wait for all uploads to complete
    await Promise.all(uploadPromises);
  };

  // Render form fields based on entity
  const renderFormFields = () => {
    if (!referenceData) return null;

    // Try to get fields from structure, or fall back to getting them from reference data
    let fields = {};
    if (entityStructure && entityStructure.fields) {
      fields = entityStructure.fields;
    } else {
      // Try to infer fields from the reference data if structure is not available
      // For this, we'd need to make a sample request to get the fields
      // For now, we'll use a different approach - try to get a single record to infer fields
      // But for new records, we'll just return null if no structure is available
      // This shouldn't happen if our fallback in fetchEntityStructure works
    }
    
    const fieldNames = Object.keys(fields);
    
    // If we still don't have field names, try to infer from referenceData
    if (fieldNames.length === 0) {
      // For now, just return null if we can't get the fields
      // In a real implementation, we might want to fetch a sample record to infer fields
      return (
        <div className="mb-4">
          <p className="text-red-500">Unable to load form fields. Please try refreshing the page.</p>
        </div>
      );
    }
    
    return fieldNames.map(field => {
      if (field === getPrimaryKeyField(entity) || field === 'IsDeleted' || 
          field === 'RecordCreationTimeStamp' || field === 'RecordCreationLogin' ||
          field === 'LastUpdationTimeStamp' || field === 'LastUpdationLogin') {
        return null; // Skip primary key and audit fields
      }

      const isReferenceField = field in getReferenceFields(entity);
      const referenceEntity = isReferenceField ? getReferenceFields(entity)[field] : null;

      if (isReferenceField && referenceEntity && referenceData[referenceEntity]) {
        return (
          <div key={field} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field}
            </label>
            <select
              value={formData[field] || ''}
              onChange={(e) => handleFieldChange(field, parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select {field}</option>
              {referenceData[referenceEntity].map(item => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        );
      }

      return (
        <div key={field} className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field}
          </label>
          <input
            type={field.toLowerCase().includes('password') ? 'password' : 'text'}
            value={formData[field] || ''}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Add New {getEntityDisplayName(entity)}
            </h1>
          </div>

          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Render standard form fields */}
            {renderFormFields()}

            {/* Image upload section - only for product entity */}
            {entity === 'product' && (
              <div className="mt-8 p-6 border border-gray-200 rounded-lg">
                <h2 className="text-xl font-semibold mb-4">Product Images</h2>
                
                {/* Thumbnail Image */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Thumbnail Image (for listing view)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange('thumbnail', e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Main Image */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Main Image (for product detail view)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange('main', e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Gallery Images */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gallery Images (up to 3)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleImageChange('gallery', e.target.files || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-4 mt-8">
              <button
                type="button"
                onClick={() => router.push(`/admin-dashboard/manage-tables/${entity}`)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EntityCreatePage;