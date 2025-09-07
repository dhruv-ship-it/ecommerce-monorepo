"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { validateAuth, performAutoLogout, getValidToken } from "@/utils/auth";

interface User {
  UserId: number;
  User: string;
  UserEmail: string;
  UserMobile: string;
  Gender: string;
  PIN: string;
  Locality: string;
  DoB: string;
  UserRank: string;
  Address: string;
  IsSU: string;
  IsAdmin: string;
  IsVendor: string;
  IsCourier: string;
  IsVerified: string;
  IsActivated: string;
  IsBlackListed: string;
  IsDead: string;
}

interface Customer {
  CustomerId: number;
  Customer: string;
  CustomerEmail: string;
  CustomerMobile: string;
  Gender: string;
  CustomerPIN: string;
  DoB: string;
  Address: string;
  IsVerified: string;
  IsActivated: string;
  IsBlackListed: string;
  IsDead: string;
  IsDeleted: string;
}

export default function SUDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPage, setUserPage] = useState(1);
  const [customerPage, setCustomerPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [customerTotal, setCustomerTotal] = useState(0);
  
  // User creation state
  const [createData, setCreateData] = useState({
    name: "", gender: "", mobile: "", email: "", pin: "", dob: "", address: "", password: "", role: "admin"
  });
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  
  // User editing state
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '', gender: '', mobile: '', email: '', pin: '', locality: '', dob: '', rank: '', passwd: '', address: '',
    isSU: '', isAdmin: '', isVendor: '', isCourier: '', isVerified: '', isActivated: '', isBlackListed: '', isDead: ''
  });
  
  // Customer editing state
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [editCustomerFormData, setEditCustomerFormData] = useState({
    isVerified: '', isActivated: '', isBlackListed: '', isDead: '', isDeleted: ''
  });
  
  const router = useRouter();

  // Helper function to get authenticated token
  const getAuthToken = (): string | null => {
    if (!validateAuth()) {
      performAutoLogout("/");
      return null;
    }
    
    const validToken = getValidToken();
    if (!validToken) {
      performAutoLogout("/");
      return null;
    }
    
    return validToken.token;
  };

  const fetchUsers = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    
    try {
      const response = await fetch(
        `http://localhost:4000/su/users?page=${userPage}&limit=10`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (response.ok) {
        // Ensure data.users is an array before using it
        setUsers(Array.isArray(data.users) ? data.users : []);
        setUserTotal(data.total || 0);
      } else if (response.status === 401) {
        performAutoLogout("/");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, [userPage]);

  const fetchCustomers = useCallback(async () => {
    try {
      const response = await fetch(
        `http://localhost:4000/su/customers?page=${customerPage}&limit=10`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("su_token")}`,
          },
        }
      );
      const data = await response.json();
      if (response.ok) {
        // Ensure data.customers is an array before using it
        setCustomers(Array.isArray(data.customers) ? data.customers : []);
        setCustomerTotal(data.total || 0);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  }, [customerPage]);

  useEffect(() => {
    // Validate authentication on page load
    if (!validateAuth()) {
      performAutoLogout("/");
      return;
    }
    
    const validToken = getValidToken();
    if (!validToken) {
      performAutoLogout("/");
      return;
    }
    
    fetchUsers();
    fetchCustomers();
  }, [router, fetchUsers, fetchCustomers]);

  // Handle user creation
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreateSuccess("");
    try {
      const response = await fetch("http://localhost:4000/su/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("su_token")}`,
        },
        body: JSON.stringify(createData),
      });
      const data = await response.json();
      if (response.ok) {
        setCreateSuccess("User created successfully!");
        setCreateData({ name: "", gender: "", mobile: "", email: "", pin: "", dob: "", address: "", password: "", role: "admin" });
        fetchUsers();
      } else {
        setCreateError(data.error || "Failed to create user");
      }
    } catch (error) {
      console.error('Error creating user:', error);
      setCreateError("Network error. Please try again.");
    }
  };

  // Handle user editing
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    
    try {
      const response = await fetch(`http://localhost:4000/su/user/${editUser.UserId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("su_token")}`,
        },
        body: JSON.stringify(editFormData),
      });
      const data = await response.json();
      if (response.ok) {
        setEditUser(null);
        fetchUsers();
      } else {
        setCreateError(data.error || "Failed to update user");
      }
    } catch (error) {
      console.error('Error updating user:', error);
      setCreateError("Network error. Please try again.");
    }
  };

  // Handle customer editing
  const handleEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCustomer) return;
    
    try {
      const response = await fetch(`http://localhost:4000/su/customer/${editCustomer.CustomerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("su_token")}`,
        },
        body: JSON.stringify(editCustomerFormData),
      });
      const data = await response.json();
      if (response.ok) {
        setEditCustomer(null);
        fetchCustomers();
      } else {
        setCreateError(data.error || "Failed to update customer");
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      setCreateError("Network error. Please try again.");
    }
  };

  // Handle soft delete customer
  const handleSoftDeleteCustomer = async (customerId: number) => {
    try {
      const response = await fetch(`http://localhost:4000/su/customer/${customerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("su_token")}`,
        },
        body: JSON.stringify({ isDeleted: "Y" }),
      });
      if (response.ok) {
        fetchCustomers();
      }
    } catch (error) {
      console.error("Error soft deleting customer:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("su_token");
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
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
                EcomGM - SU Dashboard
              </h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="ml-4 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          
          {/* Create User Form */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Create User (Admin, Vendor, Courier)
              </h3>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      value={createData.name}
                      onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Gender</label>
                    <select
                      value={createData.gender}
                      onChange={(e) => setCreateData({ ...createData, gender: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select Gender</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="O">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Mobile</label>
                    <input
                      type="text"
                      value={createData.mobile}
                      onChange={(e) => setCreateData({ ...createData, mobile: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={createData.email}
                      onChange={(e) => setCreateData({ ...createData, email: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">PIN</label>
                    <input
                      type="text"
                      value={createData.pin}
                      onChange={(e) => setCreateData({ ...createData, pin: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                    <input
                      type="date"
                      value={createData.dob}
                      onChange={(e) => setCreateData({ ...createData, dob: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <input
                      type="text"
                      value={createData.address}
                      onChange={(e) => setCreateData({ ...createData, address: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <input
                      type="password"
                      value={createData.password}
                      onChange={(e) => setCreateData({ ...createData, password: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <select
                      value={createData.role}
                      onChange={(e) => setCreateData({ ...createData, role: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="admin">Admin</option>
                      <option value="vendor">Vendor</option>
                      <option value="courier">Courier</option>
                    </select>
                  </div>
                </div>
                {createError && <div className="text-red-600 text-sm">{createError}</div>}
                {createSuccess && <div className="text-green-600 text-sm">{createSuccess}</div>}
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Create User
                </button>
              </form>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Users Section */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  All Users
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Array.isArray(users) && users.map((user) => (
                        <tr key={user.UserId}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {user.User}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.UserEmail}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.IsAdmin === "Y" && "Admin"}
                            {user.IsVendor === "Y" && "Vendor"}
                            {user.IsCourier === "Y" && "Courier"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                user.IsVerified === "Y" && user.IsActivated === "Y"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {user.IsVerified === "Y" && user.IsActivated === "Y"
                                ? "Active"
                                : "Inactive"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <button
                              onClick={() => {
                                setEditUser(user);
                                setEditFormData({
                                  name: user.User,
                                  gender: user.Gender,
                                  mobile: user.UserMobile,
                                  email: user.UserEmail,
                                  pin: user.PIN,
                                  locality: user.Locality,
                                  dob: user.DoB,
                                  rank: user.UserRank,
                                  passwd: '',
                                  address: user.Address,
                                  isSU: user.IsSU,
                                  isAdmin: user.IsAdmin,
                                  isVendor: user.IsVendor,
                                  isCourier: user.IsCourier,
                                  isVerified: user.IsVerified,
                                  isActivated: user.IsActivated,
                                  isBlackListed: user.IsBlackListed,
                                  isDead: user.IsDead,
                                });
                              }}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex justify-between items-center">
                  <div className="text-sm text-gray-700">
                    Showing {((userPage - 1) * 10) + 1} to{" "}
                    {Math.min(userPage * 10, userTotal)} of {userTotal} users
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setUserPage(Math.max(1, userPage - 1))}
                      disabled={userPage === 1}
                      className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setUserPage(userPage + 1)}
                      disabled={userPage * 10 >= userTotal}
                      className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Customers Section */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  All Customers
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Mobile
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Array.isArray(customers) && customers.map((customer) => (
                        <tr key={customer.CustomerId}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {customer.Customer}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {customer.CustomerEmail}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {customer.CustomerMobile}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                customer.IsDeleted === "Y"
                                  ? "bg-red-100 text-red-800"
                                  : customer.IsBlackListed === "Y"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : customer.IsVerified === "Y" && customer.IsActivated === "Y"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {customer.IsDeleted === "Y"
                                ? "Deleted"
                                : customer.IsBlackListed === "Y"
                                ? "Blacklisted"
                                : customer.IsVerified === "Y" && customer.IsActivated === "Y"
                                ? "Active"
                                : "Inactive"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <button
                              onClick={() => {
                                setEditCustomer(customer);
                                setEditCustomerFormData({
                                  isVerified: customer.IsVerified,
                                  isActivated: customer.IsActivated,
                                  isBlackListed: customer.IsBlackListed,
                                  isDead: customer.IsDead,
                                  isDeleted: customer.IsDeleted,
                                });
                              }}
                              className="text-blue-600 hover:text-blue-900 mr-2"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleSoftDeleteCustomer(customer.CustomerId)}
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
                <div className="mt-4 flex justify-between items-center">
                  <div className="text-sm text-gray-700">
                    Showing {((customerPage - 1) * 10) + 1} to{" "}
                    {Math.min(customerPage * 10, customerTotal)} of {customerTotal} customers
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCustomerPage(Math.max(1, customerPage - 1))}
                      disabled={customerPage === 1}
                      className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCustomerPage(customerPage + 1)}
                      disabled={customerPage * 10 >= customerTotal}
                      className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit User Dialog */}
      {editUser && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-white rounded-lg p-8 w-full max-w-lg shadow-lg max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Edit User</h2>
            <form onSubmit={handleEditUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mobile</label>
                  <input
                    type="text"
                    value={editFormData.mobile}
                    onChange={(e) => setEditFormData({ ...editFormData, mobile: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">PIN</label>
                  <input
                    type="text"
                    value={editFormData.pin}
                    onChange={(e) => setEditFormData({ ...editFormData, pin: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <input
                    type="text"
                    value={editFormData.address}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password (leave blank to keep unchanged)</label>
                  <input
                    type="password"
                    value={editFormData.passwd}
                    onChange={(e) => setEditFormData({ ...editFormData, passwd: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Is SU</label>
                  <select
                    value={editFormData.isSU}
                    onChange={(e) => setEditFormData({ ...editFormData, isSU: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Unset</option>
                    <option value="Y">Yes</option>
                    <option value="N">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Is Admin</label>
                  <select
                    value={editFormData.isAdmin}
                    onChange={(e) => setEditFormData({ ...editFormData, isAdmin: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Unset</option>
                    <option value="Y">Yes</option>
                    <option value="N">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Is Vendor</label>
                  <select
                    value={editFormData.isVendor}
                    onChange={(e) => setEditFormData({ ...editFormData, isVendor: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Unset</option>
                    <option value="Y">Yes</option>
                    <option value="N">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Is Courier</label>
                  <select
                    value={editFormData.isCourier}
                    onChange={(e) => setEditFormData({ ...editFormData, isCourier: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Unset</option>
                    <option value="Y">Yes</option>
                    <option value="N">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Is Verified</label>
                  <select
                    value={editFormData.isVerified}
                    onChange={(e) => setEditFormData({ ...editFormData, isVerified: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Unset</option>
                    <option value="Y">Yes</option>
                    <option value="N">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Is Activated</label>
                  <select
                    value={editFormData.isActivated}
                    onChange={(e) => setEditFormData({ ...editFormData, isActivated: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Unset</option>
                    <option value="Y">Yes</option>
                    <option value="N">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Is BlackListed</label>
                  <select
                    value={editFormData.isBlackListed}
                    onChange={(e) => setEditFormData({ ...editFormData, isBlackListed: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Unset</option>
                    <option value="Y">Yes</option>
                    <option value="N">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Is Dead</label>
                  <select
                    value={editFormData.isDead}
                    onChange={(e) => setEditFormData({ ...editFormData, isDead: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Unset</option>
                    <option value="Y">Yes</option>
                    <option value="N">No</option>
                  </select>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Dialog */}
      {editCustomer && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-white rounded-lg p-8 w-full max-w-md shadow-lg">
            <h2 className="text-xl font-bold mb-4">Edit Customer Status</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Customer:</strong> {editCustomer.Customer}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Email:</strong> {editCustomer.CustomerEmail}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Mobile:</strong> {editCustomer.CustomerMobile}
              </p>
            </div>
            <form onSubmit={handleEditCustomer} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Is Verified</label>
                  <select
                    value={editCustomerFormData.isVerified}
                    onChange={(e) => setEditCustomerFormData({ ...editCustomerFormData, isVerified: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Unset</option>
                    <option value="Y">Yes</option>
                    <option value="N">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Is Activated</label>
                  <select
                    value={editCustomerFormData.isActivated}
                    onChange={(e) => setEditCustomerFormData({ ...editCustomerFormData, isActivated: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Unset</option>
                    <option value="Y">Yes</option>
                    <option value="N">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Is BlackListed</label>
                  <select
                    value={editCustomerFormData.isBlackListed}
                    onChange={(e) => setEditCustomerFormData({ ...editCustomerFormData, isBlackListed: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Unset</option>
                    <option value="Y">Yes</option>
                    <option value="N">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Is Dead</label>
                  <select
                    value={editCustomerFormData.isDead}
                    onChange={(e) => setEditCustomerFormData({ ...editCustomerFormData, isDead: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Unset</option>
                    <option value="Y">Yes</option>
                    <option value="N">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Is Deleted</label>
                  <select
                    value={editCustomerFormData.isDeleted}
                    onChange={(e) => setEditCustomerFormData({ ...editCustomerFormData, isDeleted: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Unset</option>
                    <option value="Y">Yes</option>
                    <option value="N">No</option>
                  </select>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditCustomer(null)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 







