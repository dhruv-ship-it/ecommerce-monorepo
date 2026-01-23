'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { validateCustomerAuth, performCustomerLogout, getCustomerFromToken } from '../../../utils/auth';

const API = process.env.NEXT_PUBLIC_API_URL;

interface Locality {
  LocalityId: number;
  Locality: string;
}

export default function EditProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  // Profile edit form
  const editForm = useForm({ 
    defaultValues: { 
      name: '', 
      gender: '', 
      mobile: '', 
      email: '', 
      address: '', 
      dob: '', 
      pin: '', 
      locality: 0, 
      rank: 0 
    } 
  });

  // Password change form
  const passwordForm = useForm({ 
    defaultValues: { 
      oldPassword: '', 
      newPassword: '', 
      confirmNewPassword: '' 
    } 
  });

  // Fetch profile data
  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const res = await fetch(`${API}/api/customer/profile`, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        const data = await res.json();
        if (res.ok) {
          setProfile(data.customer);
        } else {
          toast({ 
            title: 'Error', 
            description: data.error, 
            variant: 'destructive' 
          });
        }
      } catch (error) {
        toast({ 
          title: 'Error', 
          description: 'Failed to load profile', 
          variant: 'destructive' 
        });
      }
      setLoading(false);
    }

    fetchProfile();
  }, []);

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      editForm.reset({
        name: profile.Customer,
        gender: profile.Gender,
        mobile: profile.CustomerMobile,
        email: profile.CustomerEmail,
        address: profile.Address,
        dob: profile.DoB,
        pin: profile.CustomerPIN,
        locality: profile.Locality || 0,
        rank: profile.CustomerRank || 0,
      });
      
      // Fetch localities
      fetchLocalities();
    }
  }, [profile]);

  // Fetch localities
  const fetchLocalities = async () => {
    try {
      const response = await fetch(`${API}/api/localities`);
      if (response.ok) {
        const data = await response.json();
        // Define type for incoming data
        interface ApiLocality {
          id: number;
          name: string;
        }
        const localitiesArray = Array.isArray(data.localities) ? data.localities : [];
        // Transform the API response to match the Locality interface
        const transformedLocalities: Locality[] = localitiesArray.map((loc: ApiLocality) => ({
          LocalityId: loc.id,
          Locality: loc.name
        }));
        setLocalities(transformedLocalities);
      }
    } catch (err) {
      console.error("Error fetching localities:", err);
    }
  };

  // Handle profile update
  async function handleEdit(data: any) {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/customer/profile`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          name: data.name,
          gender: data.gender,
          mobile: data.mobile,
          email: data.email,
          address: data.address,
          dob: data.dob,
          pin: data.pin,
          locality: data.locality,
          rank: data.rank,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        toast({ title: 'Profile updated successfully' });
        // Update local profile state
        setProfile({ 
          ...profile, 
          Customer: data.name,
          Gender: data.gender,
          CustomerMobile: data.mobile,
          CustomerEmail: data.email,
          Address: data.address,
          DoB: data.dob,
          CustomerPIN: data.pin,
          Locality: data.locality,
          CustomerRank: data.rank,
        });
        router.push('/profile');
      } else {
        toast({ 
          title: 'Error', 
          description: json.error, 
          variant: 'destructive' 
        });
      }
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'Update failed', 
        variant: 'destructive' 
      });
    }
  }

  // Handle password change
  async function handleChangePassword(data: any) {
    if (data.newPassword !== data.confirmNewPassword) {
      toast({ 
        title: 'Error', 
        description: 'New passwords do not match', 
        variant: 'destructive' 
      });
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/customer/password`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          oldPassword: data.oldPassword,
          newPassword: data.newPassword,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        toast({ title: 'Password updated successfully' });
        setChangePasswordOpen(false);
        passwordForm.reset({ 
          oldPassword: '', 
          newPassword: '', 
          confirmNewPassword: '' 
        });
      } else {
        toast({ 
          title: 'Error', 
          description: json.error, 
          variant: 'destructive' 
        });
      }
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'Password update failed', 
        variant: 'destructive' 
      });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">No profile data</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Edit Profile</h1>
          <Button 
            variant="outline" 
            onClick={() => router.push('/profile')}
          >
            Back to Profile
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Profile Edit Form */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <Input 
                    {...editForm.register('name')} 
                    required 
                    className="w-full text-gray-900 bg-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select 
                    {...editForm.register('gender')} 
                    required 
                    className="w-full border rounded p-2 text-gray-900 bg-white"
                  >
                    <option value="">Select Gender</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                  <Input 
                    type="tel" 
                    {...editForm.register('mobile')} 
                    required 
                    className="w-full text-gray-900 bg-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <Input 
                    type="email" 
                    {...editForm.register('email')} 
                    required 
                    className="w-full text-gray-900 bg-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <Input 
                    {...editForm.register('address')} 
                    required 
                    className="w-full text-gray-900 bg-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <Input 
                    type="date" 
                    {...editForm.register('dob')} 
                    required 
                    className="w-full text-gray-900 bg-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PIN</label>
                  <Input 
                    {...editForm.register('pin')} 
                    required 
                    minLength={4} 
                    maxLength={10}
                    className="w-full text-gray-900 bg-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Locality</label>
                  <select 
                    {...editForm.register('locality')} 
                    className="w-full border rounded p-2 text-gray-900 bg-white"
                    disabled={localities.length === 0}
                  >
                    <option value="0" className="text-gray-700 bg-white">
                      {localities.length === 0 ? 'Loading...' : 'Select Locality'}
                    </option>
                    {localities.map(locality => (
                      <option 
                        key={locality.LocalityId} 
                        value={locality.LocalityId} 
                        className="text-gray-900 bg-white"
                      >
                        {locality.Locality}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rank</label>
                  <Input 
                    type="number" 
                    {...editForm.register('rank')} 
                    min="0" 
                    max="99"
                    className="w-full text-gray-900 bg-white"
                  />
                </div>
                
                <div className="flex space-x-4 pt-4">
                  <Button type="submit" className="flex-1">Save Changes</Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => router.push('/profile')}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Password Change Section */}
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
            </CardHeader>
            <CardContent>
              {!changePasswordOpen ? (
                <div className="text-center py-8">
                  <Button 
                    onClick={() => setChangePasswordOpen(true)}
                    className="w-full max-w-xs"
                  >
                    Change Password
                  </Button>
                </div>
              ) : (
                <form onSubmit={passwordForm.handleSubmit(handleChangePassword)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                    <Input 
                      type="password" 
                      {...passwordForm.register('oldPassword')} 
                      required 
                      className="w-full text-gray-900 bg-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <Input 
                      type="password" 
                      {...passwordForm.register('newPassword')} 
                      required 
                      minLength={6}
                      className="w-full text-gray-900 bg-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                    <Input 
                      type="password" 
                      {...passwordForm.register('confirmNewPassword')} 
                      required 
                      minLength={6}
                      className="w-full text-gray-900 bg-white"
                    />
                  </div>
                  
                  <div className="flex space-x-4 pt-4">
                    <Button type="submit" className="flex-1">Update Password</Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => {
                        setChangePasswordOpen(false);
                        passwordForm.reset();
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}