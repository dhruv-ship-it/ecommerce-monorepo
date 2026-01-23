"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { validateAuth, performAutoLogout, getValidToken } from "@/utils/auth";

interface Customer {
  CustomerId: number;
  Customer: string;
  Gender: string;
  CustomerMobile: string;
  CustomerEmail: string;
  CustomerPIN: string;
  Locality: number;
  DoB: string;
  CustomerRank: number;
  Passwd: string;
  Address: string;
  IsVerified: string;
  VerificationTimeStamp: string;
  IsActivated: string;
  ActivationTimeStamp: string;
  IsBlackListed: string;
  BlackListTimeStamp: string;
  IsDead: string;
  DeadTimeStamp: string;
  IsDeleted: string;
  RecordCreationTimeStamp: string;
  RecordCreationLogin: string;
  LastUpdationTimeStamp: string;
  LastUpdationLogin: string;
}

interface Locality {
  LocalityId: number;
  Locality: string;
}

export default function EditCustomerPage() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [localities, setLocalities] = useState<Locality[]>([]);
  console.log('Component render - localities length:', localities.length, 'localities:', localities);
  const [formData, setFormData] = useState({
    name: '', gender: '', mobile: '', email: '', pin: '', locality: 0, dob: '', rank: 0, address: '',
    isVerified: '', isActivated: '', isBlackListed: '', isDead: '', isDeleted: '',
    verificationTimeStamp: '', activationTimeStamp: '', blackListTimeStamp: '', deadTimeStamp: '', recordCreationTimeStamp: '',
    recordCreationLogin: '', lastUpdationTimeStamp: '', lastUpdationLogin: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();
  const params = useParams(); // { id: string }

  useEffect(() => {
    // Validate authentication on page load
    if (!validateAuth()) {
      performAutoLogout("/");
      return;
    }
    
    fetchCustomerData();
    fetchLocalities();
  }, []);

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.Customer,
        gender: customer.Gender,
        mobile: customer.CustomerMobile,
        email: customer.CustomerEmail,
        pin: customer.CustomerPIN,
        locality: customer.Locality || 0,
        dob: customer.DoB,
        rank: customer.CustomerRank || 0,
        address: customer.Address,
        isVerified: customer.IsVerified,
        isActivated: customer.IsActivated,
        isBlackListed: customer.IsBlackListed,
        isDead: customer.IsDead,
        isDeleted: customer.IsDeleted,
        verificationTimeStamp: customer.VerificationTimeStamp,
        activationTimeStamp: customer.ActivationTimeStamp,
        blackListTimeStamp: customer.BlackListTimeStamp,
        deadTimeStamp: customer.DeadTimeStamp,
        recordCreationTimeStamp: customer.RecordCreationTimeStamp,
        recordCreationLogin: customer.RecordCreationLogin,
        lastUpdationTimeStamp: customer.LastUpdationTimeStamp,
        lastUpdationLogin: customer.LastUpdationLogin
      });
    }
  }, [customer]);

  const fetchCustomerData = async () => {
    try {
      const validToken = getValidToken();
      if (!validToken) {
        performAutoLogout("/");
        return;
      }

      const customerId = params.id;
      const response = await fetch(`http://localhost:4000/admin/customer/${customerId}`, {
        headers: {
          Authorization: `Bearer ${validToken.token}`,
        },
      });

      if (response.ok) {
        const customerData = await response.json();
        setCustomer(customerData);
      } else if (response.status === 401) {
        performAutoLogout("/");
      } else {
        setError("Failed to fetch customer data");
      }
    } catch (err) {
      console.error("Error fetching customer:", err);
      setError("Error fetching customer data");
    } finally {
      setLoading(false);
    }
  };

  const fetchLocalities = async () => {
    try {
      console.log('Fetching localities...');
      const response = await fetch("http://localhost:4000/api/localities");
      console.log('Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Raw API response:', data);
        // Define type for incoming data
        interface ApiLocality {
          id: number;
          name: string;
        }
        const localitiesArray = Array.isArray(data.localities) ? data.localities : [];
        console.log('Transformed localities array:', localitiesArray);
        // Transform the API response to match the Locality interface
        const transformedLocalities: Locality[] = localitiesArray.map((loc: ApiLocality) => ({
          LocalityId: loc.id,
          Locality: loc.name
        }));
        console.log('Final transformed localities:', transformedLocalities);
        setLocalities(transformedLocalities);
      } else {
        console.error('Failed to fetch localities, status:', response.status);
      }
    } catch (err) {
      console.error("Error fetching localities:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const validToken = getValidToken();
      if (!validToken) {
        performAutoLogout("/");
        return;
      }

      const response = await fetch(`http://localhost:4000/admin/customer/${customer?.CustomerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${validToken.token}`,
        },
        body: JSON.stringify({
          Customer: formData.name,
          Gender: formData.gender,
          CustomerMobile: formData.mobile,
          CustomerEmail: formData.email,
          CustomerPIN: formData.pin,
          Locality: formData.locality,
          DoB: formData.dob,
          CustomerRank: formData.rank,
          Address: formData.address,
          IsVerified: formData.isVerified,
          IsActivated: formData.isActivated,
          IsBlackListed: formData.isBlackListed,
          IsDead: formData.isDead,
          IsDeleted: formData.isDeleted,
          // Note: Password is not updated through this form
          // Timestamps and login info are automatically managed by the database
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess("Customer updated successfully!");
      } else {
        setError(data.error || "Failed to update customer");
      }
    } catch (err) {
      console.error("Error updating customer:", err);
      setError("Network error. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">
                  SmartKartMGM - Admin Dashboard
                </h1>
              </div>
              <div className="flex items-center">
                <button
                  onClick={() => router.push("/admin-dashboard/view-customers")}
                  className="ml-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Back to Customers
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Error</h3>
                  <p className="mt-1 text-sm text-gray-500">Customer not found</p>
                  <div className="mt-6">
                    <button
                      onClick={() => router.push("/admin-dashboard/view-customers")}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Back to Customers
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                SmartKartMGM - Admin Dashboard
              </h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => router.push("/admin-dashboard/view-customers")}
                className="ml-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Back to Customers
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6 text-blue-600">
                Edit Customer: {customer.Customer}
              </h3>

              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Mobile</label>
                    <input
                      type="text"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">PIN</label>
                    <input
                      type="text"
                      value={formData.pin}
                      onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Gender</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="O">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Locality</label>
                    <select
                      value={formData.locality}
                      onChange={(e) => {
                        console.log('Locality dropdown changed:', e.target.value);
                        setFormData({ ...formData, locality: parseInt(e.target.value) || 0 });
                      }}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                      disabled={localities.length === 0}
                    >
                      <option value="0" className="text-gray-700 bg-white">{localities.length === 0 ? 'Loading...' : 'Select Locality'}</option>
                      {localities.map(locality => (
                        <option key={`locality-${locality.LocalityId}`} value={locality.LocalityId} className="text-gray-900 bg-white">
                          {locality.Locality}
                        </option>
                      ))}
                    </select>

                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Rank</label>
                    <input
                      type="number"
                      value={formData.rank}
                      onChange={(e) => setFormData({ ...formData, rank: parseInt(e.target.value) || 0 })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div className="border-t pt-6 mt-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Record Creation Time</label>
                      <input
                        type="text"
                        value={customer?.RecordCreationTimeStamp || ''}
                        readOnly
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Record Creation Login</label>
                      <input
                        type="text"
                        value={customer?.RecordCreationLogin || ''}
                        readOnly
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Last Update Time</label>
                      <input
                        type="text"
                        value={customer?.LastUpdationTimeStamp || ''}
                        readOnly
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Last Update Login</label>
                      <input
                        type="text"
                        value={customer?.LastUpdationLogin || ''}
                        readOnly
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Verification Time</label>
                      <input
                        type="text"
                        value={customer?.VerificationTimeStamp || ''}
                        readOnly
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Activation Time</label>
                      <input
                        type="text"
                        value={customer?.ActivationTimeStamp || ''}
                        readOnly
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Blacklist Time</label>
                      <input
                        type="text"
                        value={customer?.BlackListTimeStamp || ''}
                        readOnly
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Death Time</label>
                      <input
                        type="text"
                        value={customer?.DeadTimeStamp || ''}
                        readOnly
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Is Verified</label>
                    <select
                      value={formData.isVerified}
                      onChange={(e) => setFormData({ ...formData, isVerified: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Unset</option>
                      <option value="Y">Yes</option>
                      <option value="N">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Is Activated</label>
                    <select
                      value={formData.isActivated}
                      onChange={(e) => setFormData({ ...formData, isActivated: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Unset</option>
                      <option value="Y">Yes</option>
                      <option value="N">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Is BlackListed</label>
                    <select
                      value={formData.isBlackListed}
                      onChange={(e) => setFormData({ ...formData, isBlackListed: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Unset</option>
                      <option value="Y">Yes</option>
                      <option value="N">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Is Dead</label>
                    <select
                      value={formData.isDead}
                      onChange={(e) => setFormData({ ...formData, isDead: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Unset</option>
                      <option value="Y">Yes</option>
                      <option value="N">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Is Deleted</label>
                    <select
                      value={formData.isDeleted}
                      onChange={(e) => setFormData({ ...formData, isDeleted: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Unset</option>
                      <option value="Y">Yes</option>
                      <option value="N">No</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => router.push("/admin-dashboard/view-customers")}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
