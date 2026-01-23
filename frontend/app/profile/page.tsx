'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { validateCustomerAuth, performCustomerLogout, getCustomerFromToken } from '../../utils/auth';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        </div>

        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
                <div className="space-y-3">
                  <div><span className="font-medium">Name:</span> {profile.Customer}</div>
                  <div><span className="font-medium">Email:</span> {profile.CustomerEmail}</div>
                  <div><span className="font-medium">Gender:</span> {profile.Gender}</div>
                  <div><span className="font-medium">Mobile:</span> {profile.CustomerMobile}</div>
                  <div><span className="font-medium">Date of Birth:</span> {profile.DoB}</div>
                </div>
              </div>
              
              <div>
                <h2 className="text-xl font-semibold mb-4">Address Information</h2>
                <div className="space-y-3">
                  <div><span className="font-medium">Address:</span> {profile.Address}</div>
                  <div><span className="font-medium">PIN:</span> {profile.CustomerPIN}</div>
                  <div><span className="font-medium">Locality:</span> {profile.Locality}</div>
                  <div><span className="font-medium">Rank:</span> {profile.CustomerRank}</div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex gap-4">
              <Button onClick={() => router.push('/profile/edit')}>
                Edit Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}