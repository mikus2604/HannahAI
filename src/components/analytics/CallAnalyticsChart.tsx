import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, Activity, Users } from "lucide-react";
import { useState, useEffect } from "react";

interface CallAnalyticsData {
  period: string;
  totalCalls: number;
  completedCalls: number;
  failedCalls: number;
  duration: number;
}

interface CallAnalyticsChartProps {
  data: CallAnalyticsData[];
  timePeriod: string;
  onTimePeriodChange: (period: string) => void;
  isLoading?: boolean;
}

const chartConfig = {
  totalCalls: {
    label: "Total Calls",
    color: "hsl(var(--chart-1))",
  },
  completedCalls: {
    label: "Completed",
    color: "hsl(var(--chart-2))",
  },
  failedCalls: {
    label: "Failed",
    color: "hsl(var(--chart-3))",
  },
  duration: {
    label: "Duration (min)",
    color: "hsl(var(--chart-4))",
  },
};

export const CallAnalyticsChart = ({ 
  data, 
  timePeriod, 
  onTimePeriodChange, 
  isLoading = false 
}: CallAnalyticsChartProps) => {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');
  const [dataView, setDataView] = useState<'calls' | 'duration'>('calls');

  // Calculate summary metrics
  const totalCalls = data.reduce((sum, item) => sum + item.totalCalls, 0);
  const totalCompleted = data.reduce((sum, item) => sum + item.completedCalls, 0);
  const totalFailed = data.reduce((sum, item) => sum + item.failedCalls, 0);
  const successRate = totalCalls > 0 ? ((totalCompleted / totalCalls) * 100).toFixed(1) : '0';

  // Prepare pie chart data
  const pieData = [
    { name: 'Completed', value: totalCompleted, color: 'hsl(var(--chart-2))' },
    { name: 'Failed', value: totalFailed, color: 'hsl(var(--chart-3))' },
  ];

  const renderChart = () => {
    if (isLoading) {
      return (
        <div className="h-[400px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    const chartData = data.map(item => ({
      ...item,
      durationMin: Math.round(item.duration / 60),
    }));

    if (chartType === 'pie') {
      return (
        <div className="w-full h-[400px] flex justify-center">
          <PieChart width={400} height={400}>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={120}
              paddingAngle={5}
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
          </PieChart>
        </div>
      );
    }

    if (chartType === 'line') {
      return (
        <div className="w-full h-[400px]">
          <LineChart width={800} height={400} data={chartData}>
            <XAxis 
              dataKey="period" 
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 12 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {dataView === 'calls' ? (
              <>
                <Line
                  type="monotone"
                  dataKey="totalCalls"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="completedCalls"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </>
            ) : (
              <Line
                type="monotone"
                dataKey="durationMin"
                stroke="hsl(var(--chart-4))"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            )}
          </LineChart>
        </div>
      );
    }

    // Default to bar chart
    return (
      <div className="w-full h-[400px]">
        <BarChart 
          width={800} 
          height={400} 
          data={chartData} 
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          onClick={(data) => {
            if (data && data.activePayload && data.activePayload.length > 0) {
              const clickedData = data.activePayload[0].payload;
              
              // Create detailed popup content
              const detailsContent = {
                period: clickedData.period,
                totalCalls: clickedData.totalCalls,
                completedCalls: clickedData.completedCalls,
                failedCalls: clickedData.failedCalls,
                duration: clickedData.duration,
                completionRate: Math.round((clickedData.completedCalls / clickedData.totalCalls) * 100) || 0
              };
              
              // Show modal with period details
              const modal = document.createElement('div');
              modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
              modal.innerHTML = `
                <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                  <h3 class="text-lg font-bold mb-4">Period Details: ${detailsContent.period}</h3>
                  <div class="space-y-3">
                    <div class="flex justify-between">
                      <span>Total Calls:</span>
                      <span class="font-bold">${detailsContent.totalCalls}</span>
                    </div>
                    <div class="flex justify-between">
                      <span>Completed:</span>
                      <span class="font-bold text-green-600">${detailsContent.completedCalls}</span>
                    </div>
                    <div class="flex justify-between">
                      <span>Failed:</span>
                      <span class="font-bold text-red-600">${detailsContent.failedCalls}</span>
                    </div>
                    <div class="flex justify-between">
                      <span>Success Rate:</span>
                      <span class="font-bold">${detailsContent.completionRate}%</span>
                    </div>
                    <div class="flex justify-between">
                      <span>Avg Duration:</span>
                      <span class="font-bold">${Math.round(detailsContent.duration / 60)}m</span>
                    </div>
                  </div>
                  <button 
                    class="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
                    onclick="this.closest('.fixed').remove()"
                  >
                    Close
                  </button>
                </div>
              `;
              
              document.body.appendChild(modal);
              modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
              });
            }
          }}
        >
          <XAxis 
            dataKey="period" 
            tick={{ fontSize: 12 }}
            interval="preserveStartEnd"
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <ChartTooltip content={<ChartTooltipContent />} />
          {dataView === 'calls' ? (
            <>
              <Bar
                dataKey="totalCalls"
                fill="hsl(var(--chart-1))"
                radius={[4, 4, 0, 0]}
                name="Total Calls"
                style={{ cursor: 'pointer' }}
              />
              <Bar
                dataKey="completedCalls"
                fill="hsl(var(--chart-2))"
                radius={[4, 4, 0, 0]}
                name="Completed"
                style={{ cursor: 'pointer' }}
              />
              <Bar
                dataKey="failedCalls"
                fill="hsl(var(--chart-3))"
                radius={[4, 4, 0, 0]}
                name="Failed"
                style={{ cursor: 'pointer' }}
              />
            </>
          ) : (
            <Bar
              dataKey="durationMin"
              fill="hsl(var(--chart-4))"
              radius={[4, 4, 0, 0]}
              name="Duration (min)"
              style={{ cursor: 'pointer' }}
            />
          )}
        </BarChart>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Analytics Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCalls}</div>
            <p className="text-xs text-muted-foreground">
              {timePeriod} period
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate}%</div>
            <p className="text-xs text-muted-foreground">
              {totalCompleted} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Calls</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFailed}</div>
            <p className="text-xs text-muted-foreground">
              {totalCalls > 0 ? ((totalFailed / totalCalls) * 100).toFixed(1) : '0'}% failure rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalCalls > 0 ? Math.round(data.reduce((sum, item) => sum + item.duration, 0) / totalCalls / 60) : 0}m
            </div>
            <p className="text-xs text-muted-foreground">
              per call
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Call Analytics
              </CardTitle>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex gap-1">
                {['day', 'week', 'month', 'quarter', 'year'].map((period) => (
                  <Button
                    key={period}
                    variant={timePeriod === period ? "default" : "outline"}
                    size="sm"
                    onClick={() => onTimePeriodChange(period)}
                    className="capitalize"
                  >
                    {period}
                  </Button>
                ))}
              </div>
              
              <Select value={chartType} onValueChange={(value: 'bar' | 'line' | 'pie') => setChartType(value)}>
                <SelectTrigger className="w-full sm:w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                  <SelectItem value="line">Line Chart</SelectItem>
                  <SelectItem value="pie">Pie Chart</SelectItem>
                </SelectContent>
              </Select>

              {chartType !== 'pie' && (
                <Select value={dataView} onValueChange={(value: 'calls' | 'duration') => setDataView(value)}>
                  <SelectTrigger className="w-full sm:w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="calls">Call Volume</SelectItem>
                    <SelectItem value="duration">Duration</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={chartConfig}
            className="min-h-[400px] w-full"
          >
            {renderChart()}
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};