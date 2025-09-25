'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppHeader } from '@/components';

interface ChartData {
  cumulativeAttempts: {
    week: Array<{ date: string; attempts: number }>;
    month: Array<{ date: string; attempts: number }>;
  };
  averageAttempts: {
    week: number;
    month: number;
  };
  topQuestions: {
    week: Array<{ question: string; attempts: number }>;
    month: Array<{ question: string; attempts: number }>;
  };
}

interface StudentInfo {
  id: number;
  name: string;
}

export default function StudentStatsPage() {
  const params = useParams();
  const studentId = parseInt(params.student_id as string);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNaN(studentId)) {
      setError('Invalid student ID');
      setLoading(false);
      return;
    }

    fetchStatsData();
  }, [studentId]);

  const fetchStatsData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/stats/${studentId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch stats data');
      }
      
      const data = await response.json();
      setChartData(data.chartData);
      setStudentInfo(data.studentInfo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading student statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Error</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!chartData || !studentInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No data available for this student.</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <AppHeader></AppHeader>
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Statistics for {studentInfo.name}
          </h1>
          <p className="mt-2 text-gray-600">
            Student ID: {studentInfo.id}
          </p>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Cumulative Attempts Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Cumulative Attempts Over Time
            </h2>
            <CumulativeAttemptsChart data={chartData.cumulativeAttempts} />
          </div>

          {/* Average Attempts Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Average Attempts per Storyline Progress
            </h2>
            <AverageAttemptsChart data={chartData.averageAttempts} />
          </div>

          {/* Top Questions Chart */}
          <div className="bg-white rounded-lg shadow-md p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Questions with Highest Number of Guesses
            </h2>
            <TopQuestionsChart data={chartData.topQuestions} />
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

// Cumulative Attempts Chart Component
function CumulativeAttemptsChart({ data }: { data: ChartData['cumulativeAttempts'] }) {
  const [timeframe, setTimeframe] = useState<'week' | 'month'>('week');
  const currentData = data[timeframe];

  return (
    <div>
      {/* Timeframe Toggle */}
      <div className="flex mb-4">
        <button
          onClick={() => setTimeframe('week')}
          className={`px-4 py-2 rounded-l-md text-sm font-medium ${
            timeframe === 'week'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Past Week
        </button>
        <button
          onClick={() => setTimeframe('month')}
          className={`px-4 py-2 rounded-r-md text-sm font-medium ${
            timeframe === 'month'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Past Month
        </button>
      </div>

      {/* Simple Line Chart */}
      <div className="h-64 flex items-end space-x-2">
        {currentData.map((point, index) => {
          const maxAttempts = Math.max(...currentData.map(p => p.attempts));
          const height = maxAttempts > 0 ? (point.attempts / maxAttempts) * 200 : 0;
          
          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div
                className="bg-blue-500 w-full rounded-t-sm min-h-[4px]"
                style={{ height: `${height}px` }}
                title={`${point.date}: ${point.attempts} attempts`}
              />
              <div className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-left">
                {new Date(point.date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </div>
            </div>
          );
        })}
      </div>
      
      {currentData.length === 0 && (
        <div className="h-64 flex items-center justify-center text-gray-500">
          No data available for the selected timeframe
        </div>
      )}
    </div>
  );
}

// Average Attempts Chart Component
function AverageAttemptsChart({ data }: { data: ChartData['averageAttempts'] }) {
  return (
    <div className="h-64 flex items-center justify-center">
      <div className="grid grid-cols-2 gap-8 w-full max-w-md">
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {data.week.toFixed(1)}
          </div>
          <div className="text-sm text-gray-600">Past Week</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">
            {data.month.toFixed(1)}
          </div>
          <div className="text-sm text-gray-600">Past Month</div>
        </div>
      </div>
    </div>
  );
}

// Top Questions Chart Component
function TopQuestionsChart({ data }: { data: ChartData['topQuestions'] }) {
  const [timeframe, setTimeframe] = useState<'week' | 'month'>('week');
  const currentData = data[timeframe];

  return (
    <div>
      {/* Timeframe Toggle */}
      <div className="flex mb-4">
        <button
          onClick={() => setTimeframe('week')}
          className={`px-4 py-2 rounded-l-md text-sm font-medium ${
            timeframe === 'week'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Past Week
        </button>
        <button
          onClick={() => setTimeframe('month')}
          className={`px-4 py-2 rounded-r-md text-sm font-medium ${
            timeframe === 'month'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Past Month
        </button>
      </div>

      {/* Horizontal Bar Chart */}
      <div className="space-y-3">
        {currentData.slice(0, 10).map((item, index) => {
          const maxAttempts = Math.max(...currentData.map(q => q.attempts));
          const width = maxAttempts > 0 ? (item.attempts / maxAttempts) * 100 : 0;
          
          return (
            <div key={index} className="flex items-center space-x-3">
              <div className="w-8 text-sm text-gray-500 text-right">
                #{index + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-medium text-gray-900 truncate max-w-md">
                    {item.question}
                  </div>
                  <div className="text-sm text-gray-600 ml-2">
                    {item.attempts} attempts
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {currentData.length === 0 && (
        <div className="h-32 flex items-center justify-center text-gray-500">
          No data available for the selected timeframe
        </div>
      )}
    </div>
  );
}