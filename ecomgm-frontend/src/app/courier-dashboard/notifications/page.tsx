'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Clock, CheckCircle } from 'lucide-react';
import { getValidToken } from '@/utils/auth';

interface Notification {
  NotificationId: number;
  UserId: number;
  Type: string;
  Message: string;
  IsRead: string;
  RecordCreationTimeStamp: string;
}

export default function CourierNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      console.log('Fetching courier notifications...');
      
      // Use the proper auth utility to get courier token
      const tokenData = getValidToken();
      console.log('Token data:', tokenData);
      
      if (!tokenData) {
        console.error('No valid token found');
        setLoading(false);
        return;
      }
      
      const response = await fetch('http://localhost:4000/notifications/user/user', {
        headers: {
          'Authorization': `Bearer ${tokenData.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Received notifications data:', data);
        setNotifications(data.notifications);
        console.log('Set notifications state:', data.notifications.length);
      } else {
        console.error('HTTP Error:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Network Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading notifications...</div>
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
                SmartKartMGM - Courier Dashboard
              </h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => router.push('/courier-dashboard')}
                className="ml-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Bell className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
        </div>

        {notifications.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications yet</h3>
            <p className="text-gray-500">You'll see notifications about your delivery assignments here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div 
                key={notification.NotificationId} 
                className={`bg-white rounded-lg shadow ${notification.IsRead === 'N' ? 'border-l-4 border-blue-500 bg-blue-50' : ''}`}
              >
                <div className="p-6 pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {notification.IsRead === 'N' ? (
                        <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                      ) : (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      <h3 className="text-lg font-semibold text-gray-900">
                        {notification.Type}
                      </h3>
                    </div>
                    <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(notification.RecordCreationTimeStamp)}
                    </div>
                  </div>
                </div>
                <div className="px-6 pb-6">
                  <p className={`text-gray-700 ${notification.IsRead === 'N' ? 'font-medium' : ''}`}>
                    {notification.Message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}