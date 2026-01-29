'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Clock, CheckCircle } from 'lucide-react';

interface Notification {
  NotificationId: number;
  CustomerId: number;
  Type: string;
  Message: string;
  IsRead: string;
  RecordCreationTimeStamp: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      console.log('Fetching customer notifications...');
      const token = localStorage.getItem('token');
      console.log('Token found:', !!token);
      
      const response = await fetch('http://localhost:4000/notifications/customer/customer', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <Bell className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
        </div>

        {notifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications yet</h3>
              <p className="text-gray-500">You'll see notifications about your orders here</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <Card 
                key={notification.NotificationId} 
                className={notification.IsRead === 'N' ? 'border-l-4 border-blue-500 bg-blue-50' : 'bg-white'}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {notification.IsRead === 'N' ? (
                        <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                      ) : (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      <CardTitle className="text-lg">
                        {notification.Type}
                      </CardTitle>
                    </div>
                    <Badge variant="secondary">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatTime(notification.RecordCreationTimeStamp)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className={`text-gray-700 ${notification.IsRead === 'N' ? 'font-medium' : ''}`}>
                    {notification.Message}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}