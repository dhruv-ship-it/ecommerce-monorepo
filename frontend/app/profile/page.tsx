"use client"

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { validateCustomerAuth, performCustomerLogout, getCustomerFromToken } from '../../utils/auth';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function ProfilePage() {
  const [role, setRole] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false); // New state for password change modal
  const { toast } = useToast();

  // Determine role and fetch profile
  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      let payload: any = null;
      try {
        payload = JSON.parse(atob(token.split('.')[1]));
        setRole(payload.role);
      } catch {}
      try {
        let res, data;
        if (payload && payload.role === 'customer') {
          res = await fetch(`${API}/api/customer/profile`, { headers: { Authorization: `Bearer ${token}` } });
          data = await res.json();
          if (res.ok) setProfile(data.customer);
          else toast({ title: 'Error', description: data.error, variant: 'destructive' });
        } else {
          res = await fetch(`${API}/api/user/profile`, { headers: { Authorization: `Bearer ${token}` } });
          data = await res.json();
          if (res.ok) setProfile(data.user);
        else toast({ title: 'Error', description: data.error, variant: 'destructive' });
        }
      } catch {
        toast({ title: 'Error', description: 'Failed to load profile', variant: 'destructive' });
      }
      setLoading(false);
    }
    fetchProfile();
  }, []);

  // Customer edit form
  const [localities, setLocalities] = useState<any[]>([]);
  const editForm = useForm({ defaultValues: { name: '', gender: '', mobile: '', email: '', address: '', dob: '', pin: '', locality: 0, rank: 0 } });
  useEffect(() => {
    if (profile && role === 'customer') {
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
    }
    
    // Fetch localities
    fetchLocalities();
  }, [profile, role]);
  
  const fetchLocalities = async () => {
    try {
      const response = await fetch(`${API}/api/localities`);
      if (response.ok) {
        const data = await response.json();
        setLocalities(Array.isArray(data.localities) ? data.localities : []);
      }
    } catch (err) {
      console.error("Error fetching localities:", err);
    }
  };
  async function handleEdit(data: any) {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/customer/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
        toast({ title: 'Profile updated' });
        setEditOpen(false);
        setProfile({ ...profile, ...{
          Customer: data.name,
          Gender: data.gender,
          CustomerMobile: data.mobile,
          CustomerEmail: data.email,
          Address: data.address,
          DoB: data.dob,
          CustomerPIN: data.pin,
          Locality: data.locality,
          CustomerRank: data.rank,
        }});
      } else {
        toast({ title: 'Error', description: json.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Update failed', variant: 'destructive' });
    }
  }

  // Password change form
  const passwordForm = useForm({ defaultValues: { oldPassword: '', newPassword: '', confirmNewPassword: '' } });
  async function handleChangePassword(data: any) {
    if (data.newPassword !== data.confirmNewPassword) {
      toast({ title: 'Error', description: 'New passwords do not match', variant: 'destructive' });
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/customer/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          oldPassword: data.oldPassword,
          newPassword: data.newPassword,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        toast({ title: 'Password updated successfully' });
        setChangePasswordOpen(false);
        passwordForm.reset({ oldPassword: '', newPassword: '', confirmNewPassword: '' });
      } else {
        toast({ title: 'Error', description: json.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Password update failed', variant: 'destructive' });
    }
  }

  // User profile (read-only with badges and limited edit)
  const [editUserOpen, setEditUserOpen] = useState(false);
  const userEditForm = useForm({ defaultValues: { name: '', mobile: '', address: '', dob: '' } });
  useEffect(() => {
    if (profile && role !== 'customer') {
      userEditForm.reset({
        name: profile.User,
        mobile: profile.UserMobile,
        address: profile.Address,
        dob: profile.DoB,
      });
    }
  }, [profile, role]);
  async function handleUserEdit(data: any) {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/user/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: data.name,
          mobile: data.mobile,
          address: data.address,
          dob: data.dob,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        toast({ title: 'Profile updated' });
        setEditUserOpen(false);
        setProfile({ ...profile, ...{
          User: data.name,
          UserMobile: data.mobile,
          Address: data.address,
          DoB: data.dob,
        }});
      } else {
        toast({ title: 'Error', description: json.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Update failed', variant: 'destructive' });
    }
  }

  if (loading) return <div className="p-8">Loading...</div>;
  if (!profile) return <div className="p-8">No profile data</div>;

  // Customer profile (editable)
  if (role === 'customer') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4">
              <h1 className="text-3xl font-bold mb-2">My Profile</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><b>Name:</b> {profile.Customer}</div>
                <div><b>Email:</b> {profile.CustomerEmail}</div>
                <div><b>Gender:</b> {profile.Gender}</div>
                <div><b>Mobile:</b> {profile.CustomerMobile}</div>
                <div><b>Address:</b> {profile.Address}</div>
                <div><b>Date of Birth:</b> {profile.DoB}</div>
                <div><b>PIN:</b> {profile.CustomerPIN}</div>
                <div><b>Locality:</b> {profile.Locality}</div>
                <div><b>Rank:</b> {profile.CustomerRank}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                  Edit Profile
                </Button>
                <Button variant="outline" onClick={() => setChangePasswordOpen(true)}>
                  Change Password
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Edit Profile Dialog */}
        {editOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
            <div className="bg-white rounded-lg p-8 w-full max-w-lg shadow-lg">
              <h2 className="text-xl font-bold mb-4">Edit Profile</h2>
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4">
                  <FormField control={editForm.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl><Input {...field} required /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={editForm.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input type="email" {...field} required /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={editForm.control} name="gender" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <FormControl>
                        <select {...field} required className="w-full border rounded p-2">
                          <option value="">Select Gender</option>
                          <option value="M">Male</option>
                          <option value="F">Female</option>
                          <option value="O">Other</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={editForm.control} name="mobile" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile</FormLabel>
                      <FormControl><Input type="tel" {...field} required /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={editForm.control} name="address" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl><Input {...field} required /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={editForm.control} name="dob" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl><Input type="date" {...field} required /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={editForm.control} name="pin" render={({ field }) => (
                    <FormItem>
                      <FormLabel>PIN</FormLabel>
                      <FormControl><Input {...field} required minLength={4} maxLength={10} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={editForm.control} name="locality" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Locality</FormLabel>
                      <FormControl>
                        <select {...field} value={field.value} onChange={field.onChange} className="w-full border rounded p-2">
                          <option value="0">Select Locality</option>
                          {localities.map(locality => (
                            <option key={locality.LocalityId} value={locality.LocalityId}>
                              {locality.Locality}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={editForm.control} name="rank" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rank</FormLabel>
                      <FormControl><Input type="number" {...field} min="0" max="99" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full">Save</Button>
                  <Button type="button" variant="outline" className="w-full" onClick={() => setEditOpen(false)}>Cancel</Button>
                </form>
              </Form>
            </div>
          </div>
        )}
        {/* Change Password Dialog */}
        {changePasswordOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
            <div className="bg-white rounded-lg p-8 w-full max-w-lg shadow-lg">
              <h2 className="text-xl font-bold mb-4">Change Password</h2>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(handleChangePassword)} className="space-y-4">
                  <FormField control={passwordForm.control} name="oldPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl><Input type="password" {...field} required /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl><Input type="password" {...field} required minLength={6} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={passwordForm.control} name="confirmNewPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl><Input type="password" {...field} required minLength={6} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full">Change Password</Button>
                  <Button type="button" variant="outline" className="w-full" onClick={() => setChangePasswordOpen(false)}>Cancel</Button>
                </form>
              </Form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // User profile (badges, limited edit)
  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="mb-8">
        <CardContent className="p-6">
          <h1 className="text-3xl font-bold mb-2">User Profile</h1>
          <div className="flex flex-wrap gap-2 mb-4">
            {/* Role badges */}
            {profile.IsSU === 'Y' && <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Superuser</span>}
            {profile.IsAdmin === 'Y' && <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Admin</span>}
            {profile.IsVendor === 'Y' && <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">Vendor</span>}
            {profile.IsCourier === 'Y' && <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">Courier</span>}
            {/* Status badges (always show, style by value) */}
            <span className={profile.IsVerified === 'Y' ? "bg-teal-100 text-teal-800 px-2 py-1 rounded text-xs" : "bg-gray-100 text-gray-400 px-2 py-1 rounded text-xs"}>Verified</span>
            <span className={profile.IsActivated === 'Y' ? "bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-xs" : "bg-gray-100 text-gray-400 px-2 py-1 rounded text-xs"}>Activated</span>
            <span className={profile.IsBlackListed === 'Y' ? "bg-red-100 text-red-800 px-2 py-1 rounded text-xs" : "bg-gray-100 text-gray-400 px-2 py-1 rounded text-xs"}>Blacklisted</span>
            <span className={profile.IsDead === 'Y' ? "bg-gray-300 text-gray-800 px-2 py-1 rounded text-xs" : "bg-gray-100 text-gray-400 px-2 py-1 rounded text-xs"}>Dead</span>
            <span className={profile.IsDeleted === 'Y' ? "bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs" : "bg-gray-100 text-gray-400 px-2 py-1 rounded text-xs"}>Deleted</span>
            {/* Only show Rank/Locality if not 0, null, or empty */}
            {profile.UserRank && profile.UserRank !== 0 && profile.UserRank !== '0' && <span className="bg-pink-100 text-pink-800 px-2 py-1 rounded text-xs">Rank: {profile.UserRank}</span>}
            {profile.Locality && profile.Locality !== 0 && profile.Locality !== '0' && <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">Locality: {profile.Locality}</span>}
            </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><b>Name:</b> {profile.User}</div>
            <div><b>Email:</b> {profile.UserEmail}</div>
            <div><b>Gender:</b> {profile.Gender}</div>
            <div><b>Mobile:</b> {profile.UserMobile}</div>
            <div><b>Address:</b> {profile.Address}</div>
            <div><b>Date of Birth:</b> {profile.DoB}</div>
            <div><b>Account Created:</b> {profile.RecordCreationTimeStamp}</div>
            <div><b>Last Updated:</b> {profile.LastUpdationTimeStamp}</div>
            <div><b>Email Verified:</b> {profile.VerificationTimeStamp}</div>
          </div>
          <Button variant="outline" className="mt-6" onClick={() => setEditUserOpen(true)}>
            Edit Profile
          </Button>
        </CardContent>
      </Card>
      {/* Edit Profile Dialog for user */}
      {editUserOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-white rounded-lg p-8 w-full max-w-lg shadow-lg">
            <h2 className="text-xl font-bold mb-4">Edit Profile</h2>
            <Form {...userEditForm}>
              <form onSubmit={userEditForm.handleSubmit(handleUserEdit)} className="space-y-4">
                <FormField control={userEditForm.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl><Input {...field} required /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={userEditForm.control} name="mobile" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile</FormLabel>
                    <FormControl><Input type="tel" {...field} required /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={userEditForm.control} name="address" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl><Input {...field} required /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={userEditForm.control} name="dob" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl><Input type="date" {...field} required /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full">Save</Button>
                <Button type="button" variant="outline" className="w-full" onClick={() => setEditUserOpen(false)}>Cancel</Button>
            </form>
          </Form>
          </div>
                  </div>
      )}
    </div>
  );
}