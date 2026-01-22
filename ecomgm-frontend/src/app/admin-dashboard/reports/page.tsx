"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { validateAuth, performAutoLogout, getValidToken } from "@/utils/auth";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface OrderAnalytics {
  date: string;
  count: number;
  revenue: number;
}

interface DailyOrder {
  date: string;
  orderCount: number;
  revenue: number;
}

interface TopProduct {
  productName: string;
  orderCount: number;
}

interface OrderStatus {
  status: string;
  count: number;
}

export default function ReportsPage() {
  const [dailyOrders, setDailyOrders] = useState<DailyOrder[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [orderStatus, setOrderStatus] = useState<OrderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch("http://localhost:4000/admin/analytics", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDailyOrders(data.dailyOrders || []);
        setTopProducts(data.topProducts || []);
        setOrderStatus(data.orderStatus || []);
      } else if (response.status === 401) {
        performAutoLogout("/");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to fetch analytics");
      }
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setError("Failed to fetch analytics");
    } finally {
      setLoading(false);
    }
  }, []);

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
    
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Prepare data for daily orders chart
  const dailyOrdersChartData = {
    labels: dailyOrders.map(item => item.date),
    datasets: [
      {
        label: 'Order Count',
        data: dailyOrders.map(item => item.orderCount),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        yAxisID: 'y',
      },
      {
        label: 'Revenue (₹)',
        data: dailyOrders.map(item => item.revenue),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        yAxisID: 'y1',
      },
    ],
  };

  const dailyOrdersChartOptions = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Order Count',
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
        title: {
          display: true,
          text: 'Revenue (₹)',
        },
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Daily Orders and Revenue',
      },
    },
  };

  // Prepare data for top products chart
  const topProductsChartData = {
    labels: topProducts.map(item => item.productName),
    datasets: [
      {
        label: 'Order Count',
        data: topProducts.map(item => item.orderCount),
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 205, 86, 0.5)',
          'rgba(75, 192, 192, 0.5)',
          'rgba(153, 102, 255, 0.5)',
          'rgba(255, 159, 64, 0.5)',
        ],
        borderColor: [
          'rgb(255, 99, 132)',
          'rgb(54, 162, 235)',
          'rgb(255, 205, 86)',
          'rgb(75, 192, 192)',
          'rgb(153, 102, 255)',
          'rgb(255, 159, 64)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const topProductsChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Top Selling Products',
      },
    },
  };

  // Prepare data for order status chart
  const orderStatusChartData = {
    labels: orderStatus.map(item => item.status),
    datasets: [
      {
        label: 'Order Count',
        data: orderStatus.map(item => item.count),
        backgroundColor: [
          'rgba(75, 192, 192, 0.5)',
          'rgba(255, 205, 86, 0.5)',
          'rgba(255, 99, 132, 0.5)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(153, 102, 255, 0.5)',
        ],
        borderColor: [
          'rgb(75, 192, 192)',
          'rgb(255, 205, 86)',
          'rgb(255, 99, 132)',
          'rgb(54, 162, 235)',
          'rgb(153, 102, 255)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const orderStatusChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Order Status Distribution',
      },
    },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                SmartKartMGM - Admin Dashboard - Reports
              </h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => router.push("/admin-dashboard")}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700"
              >
                Back to Admin Dashboard
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">
                Analytics & Reports
              </h3>
              
              {error && (
                <div className="mb-4 p-4 bg-red-50 text-red-700 rounded">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  <p className="mt-2">Loading analytics...</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Daily Orders Chart */}
                  <div className="bg-white p-6 rounded-lg shadow">
                    <div className="h-80">
                      <Line data={dailyOrdersChartData} options={dailyOrdersChartOptions} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Top Products Chart */}
                    <div className="bg-white p-6 rounded-lg shadow">
                      <div className="h-80">
                        <Bar data={topProductsChartData} options={topProductsChartOptions} />
                      </div>
                    </div>

                    {/* Order Status Chart */}
                    <div className="bg-white p-6 rounded-lg shadow">
                      <div className="h-80">
                        <Pie data={orderStatusChartData} options={orderStatusChartOptions} />
                      </div>
                    </div>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-800">Total Orders Today</h4>
                      <p className="text-2xl font-bold text-blue-900">
                        {dailyOrders.length > 0 ? dailyOrders[dailyOrders.length - 1]?.orderCount || 0 : 0}
                      </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-green-800">Today's Revenue</h4>
                      <p className="text-2xl font-bold text-green-900">
                        ₹{dailyOrders.length > 0 ? dailyOrders[dailyOrders.length - 1]?.revenue?.toFixed(2) || 0 : 0}
                      </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-purple-800">Total Products</h4>
                      <p className="text-2xl font-bold text-purple-900">
                        {topProducts.reduce((sum, product) => sum + product.orderCount, 0)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}