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

  // Image upload states
  const [thumbnailImage, setThumbnailImage] = useState<File | null>(null);
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [galleryImages, setGalleryImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<any[]>([]);
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

  // Fetch the record and reference data
  const fetchRecord = async () => {
    try {
      // Validate authentication
      const isValid = validateAuth();
      const user = getUserFromToken();
      
      if (!isValid || !user || user.userType !== 'user' || user.role !== 'admin') {
        router.push('/login');
        return;
      }

      setLoading(true);
      
      // Fetch the record
      const validToken = getValidToken();
      const recordResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin-tables/${entity}/${recordId}`, {
        headers: {
          'Authorization': `Bearer ${validToken?.token || ''}`
        }
      });
      
      if (!recordResponse.ok) {
        throw new Error(`Failed to fetch record: ${recordResponse.statusText}`);
      }
      
      const recordData = await recordResponse.json();
      setRecord(recordData);
      setFormData(recordData);
      
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
      
      // If this is a product, fetch existing images
      if (entity === 'product') {
        const imagesResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/product-images/product/${recordId}`, {
          headers: {
            'Authorization': `Bearer ${validToken?.token || ''}`
          }
        });
        
        if (imagesResponse.ok) {
          const imagesData = await imagesResponse.json();
          setExistingImages(imagesData.images);
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching the record');
      console.error('Error fetching record:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (entity && recordId) {
      fetchRecord();
    }
  }, [entity, recordId]);

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
      
      // Update the record
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin-tables/${entity}/${recordId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken?.token || ''}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update record');
      }

      // If this is a product entity and images were uploaded, upload them
      if (entity === 'product') {
        await uploadProductImages(parseInt(recordId));
      }

      // Redirect back to the entity list
      router.push(`/admin-dashboard/manage-tables/${entity}`);
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating the record');
      console.error('Error updating record:', err);
    }
  };

  // Upload product images after product update
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

  // Delete an existing image
  const deleteImage = async (imageId: number) => {
    if (!confirm('Are you sure you want to delete this image?')) {
      return;
    }
    
    try {
      const validToken = getValidToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/product-images/product/${recordId}/image/${imageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${validToken?.token || ''}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete image');
      }
      
      // Refresh the images list
      fetchRecord();
    } catch (err: any) {
      setError(err.message || 'An error occurred while deleting the image');
      console.error('Error deleting image:', err);
    }
  };

  // Render form fields based on entity
  const renderFormFields = () => {
    if (!record) return null;

    return Object.keys(record).map(field => {
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
          />
        </div>
      );
    });
  };

  // Handle cancel button click
  const handleCancel = () => {
    router.push(`/admin-dashboard/manage-tables/${entity}`);
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
              Edit {getEntityDisplayName(entity)} - ID: {recordId}
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

            {/* Image management section - only for product entity */}
            {entity === 'product' && (
              <div className="mt-8 p-6 border border-gray-200 rounded-lg">
                <h2 className="text-xl font-semibold mb-4">Product Images</h2>
                
                {/* Existing images */}
                {existingImages.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-medium mb-2">Current Images</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {existingImages.map((image) => (
                        <div key={image.ImageId} className="relative group">
                          <img 
                            src={`${process.env.NEXT_PUBLIC_BACKEND_URL}${image.ImagePath}`} 
                            alt={`${image.ImageType} image`}
                            className="w-full h-32 object-cover rounded border"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => deleteImage(image.ImageId)}
                              className="text-red-400 hover:text-red-300 text-sm"
                            >
                              Delete
                            </button>
                          </div>
                          <p className="text-xs text-center mt-1">{image.ImageType}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* New image uploads */}
                <div className="space-y-4">
                  {/* Thumbnail Image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Replace Thumbnail Image (for listing view)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageChange('thumbnail', e.target.files?.[0] || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                    />
                  </div>

                  {/* Main Image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Replace Main Image (for product detail view)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageChange('main', e.target.files?.[0] || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                    />
                  </div>

                  {/* Gallery Images */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Add Gallery Images (up to 3)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleImageChange('gallery', e.target.files || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

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