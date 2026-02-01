import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatTime } from '../hooks/useTaskManager';

const COLORS = {
  primary: '#8b5cf6',
  secondary: '#22c55e',
  warning: '#f59e0b',
  danger: '#f43f5e',
  info: '#3b82f6',
  muted: '#71717a',
};

const PIE_COLORS = ['#8b5cf6', '#22c55e', '#3b82f6', '#f59e0b', '#f43f5e', '#06b6d4'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-label">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="chart-tooltip-value" style={{ color: entry.color }}>
            {entry.name}: {entry.name.includes('Time') ? formatTime(entry.value) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const Analytics = ({ tasks }) => {
  const [activeChart, setActiveChart] = useState('overview');

  const analyticsData = useMemo(() => {
    // Task Status Distribution
    const statusDistribution = [
      { name: 'Completed', value: tasks.filter(t => t.status === 'completed').length, color: COLORS.secondary },
      { name: 'In Progress', value: tasks.filter(t => t.status === 'running').length, color: COLORS.warning },
      { name: 'Pending', value: tasks.filter(t => t.status === 'idle').length, color: COLORS.muted },
    ].filter(item => item.value > 0);

    // Time per Task (Top 5 by total time)
    const timePerTask = tasks
      .map(task => ({
        name: task.name.length > 12 ? task.name.substring(0, 12) + '...' : task.name,
        fullName: task.name,
        totalTime: task.attempts.reduce((acc, time) => acc + time, 0),
        bestTime: task.bestTime || 0,
        attempts: task.attempts.length,
      }))
      .filter(t => t.totalTime > 0)
      .sort((a, b) => b.totalTime - a.totalTime)
      .slice(0, 5);

    // Attempts Distribution
    const attemptsData = tasks
      .filter(t => t.attempts.length > 0)
      .map(task => ({
        name: task.name.length > 10 ? task.name.substring(0, 10) + '...' : task.name,
        fullName: task.name,
        attempts: task.attempts.length,
      }))
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, 6);

    // Performance Trend (simulated based on attempts)
    const performanceTrend = [];
    let attemptIndex = 1;
    tasks.forEach(task => {
      task.attempts.forEach((time, idx) => {
        performanceTrend.push({
          attempt: `#${attemptIndex}`,
          time: time,
          task: task.name.substring(0, 8),
        });
        attemptIndex++;
      });
    });
    const recentPerformance = performanceTrend.slice(-10);

    // Summary Stats
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const totalAttempts = tasks.reduce((acc, t) => acc + t.attempts.length, 0);
    const totalTime = tasks.reduce((acc, t) => acc + t.attempts.reduce((a, b) => a + b, 0), 0);
    const avgTimePerTask = totalAttempts > 0 ? Math.round(totalTime / totalAttempts) : 0;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Best Performers (tasks with most improvement)
    const bestPerformers = tasks
      .filter(t => t.attempts.length >= 2)
      .map(task => {
        const firstAttempt = task.attempts[0];
        const lastAttempt = task.attempts[task.attempts.length - 1];
        const improvement = firstAttempt > 0 ? Math.round(((firstAttempt - lastAttempt) / firstAttempt) * 100) : 0;
        return {
          name: task.name.length > 15 ? task.name.substring(0, 15) + '...' : task.name,
          fullName: task.name,
          improvement,
          attempts: task.attempts.length,
        };
      })
      .filter(t => t.improvement > 0)
      .sort((a, b) => b.improvement - a.improvement)
      .slice(0, 4);

    return {
      statusDistribution,
      timePerTask,
      attemptsData,
      recentPerformance,
      bestPerformers,
      summary: {
        totalTasks,
        completedTasks,
        totalAttempts,
        totalTime,
        avgTimePerTask,
        completionRate,
      },
    };
  }, [tasks]);

  const hasData = tasks.length > 0;
  const hasChartData = analyticsData.timePerTask.length > 0 || analyticsData.statusDistribution.length > 0;

  if (!hasData) {
    return (
      <div className="analytics-section">
        <div className="analytics-header">
          <div className="analytics-title">
            <div className="analytics-icon">📊</div>
            <div>
              <h2>Analytics Dashboard</h2>
              <p>Insights into your productivity</p>
            </div>
          </div>
        </div>
        <div className="analytics-empty">
          <div className="analytics-empty-icon">📈</div>
          <h3>No Data Yet</h3>
          <p>Complete some tasks to see your analytics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-section">
      <div className="analytics-header">
        <div className="analytics-title">
          <div className="analytics-icon">📊</div>
          <div>
            <h2>Analytics Dashboard</h2>
            <p>Insights into your productivity</p>
          </div>
        </div>
        
        <div className="chart-tabs">
          <button 
            className={`chart-tab ${activeChart === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveChart('overview')}
          >
            Overview
          </button>
          <button 
            className={`chart-tab ${activeChart === 'performance' ? 'active' : ''}`}
            onClick={() => setActiveChart('performance')}
          >
            Performance
          </button>
          <button 
            className={`chart-tab ${activeChart === 'time' ? 'active' : ''}`}
            onClick={() => setActiveChart('time')}
          >
            Time Analysis
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="analytics-summary">
        <div className="summary-card">
          <div className="summary-icon completion">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div className="summary-content">
            <span className="summary-value">{analyticsData.summary.completionRate}%</span>
            <span className="summary-label">Completion Rate</span>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="summary-icon time">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div className="summary-content">
            <span className="summary-value">{formatTime(analyticsData.summary.avgTimePerTask)}</span>
            <span className="summary-label">Avg. Time/Attempt</span>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="summary-icon attempts">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
          </div>
          <div className="summary-content">
            <span className="summary-value">{analyticsData.summary.totalAttempts}</span>
            <span className="summary-label">Total Attempts</span>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="summary-icon total">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div className="summary-content">
            <span className="summary-value">{formatTime(analyticsData.summary.totalTime)}</span>
            <span className="summary-label">Total Time Tracked</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {activeChart === 'overview' && (
          <>
            {/* Status Distribution Pie Chart */}
            <div className="chart-card">
              <div className="chart-card-header">
                <h3>Task Status Distribution</h3>
                <span className="chart-badge">Live</span>
              </div>
              <div className="chart-container pie-chart-container">
                {analyticsData.statusDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={analyticsData.statusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {analyticsData.statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        formatter={(value) => <span style={{ color: 'var(--text-secondary)' }}>{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-no-data">No status data available</div>
                )}
              </div>
            </div>

            {/* Attempts per Task */}
            <div className="chart-card">
              <div className="chart-card-header">
                <h3>Attempts per Task</h3>
                <span className="chart-badge secondary">Activity</span>
              </div>
              <div className="chart-container">
                {analyticsData.attemptsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={analyticsData.attemptsData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                      <XAxis type="number" stroke="var(--text-muted)" fontSize={12} />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        stroke="var(--text-muted)" 
                        fontSize={11}
                        width={80}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey="attempts" 
                        fill={COLORS.primary}
                        radius={[0, 4, 4, 0]}
                        name="Attempts"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-no-data">Complete some tasks to see data</div>
                )}
              </div>
            </div>
          </>
        )}

        {activeChart === 'performance' && (
          <>
            {/* Performance Trend */}
            <div className="chart-card wide">
              <div className="chart-card-header">
                <h3>Recent Performance Trend</h3>
                <span className="chart-badge">Last 10 Attempts</span>
              </div>
              <div className="chart-container">
                {analyticsData.recentPerformance.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={analyticsData.recentPerformance}>
                      <defs>
                        <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                      <XAxis dataKey="attempt" stroke="var(--text-muted)" fontSize={12} />
                      <YAxis 
                        stroke="var(--text-muted)" 
                        fontSize={12}
                        tickFormatter={(value) => formatTime(value)}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="time"
                        stroke={COLORS.primary}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorTime)"
                        name="Time"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-no-data">Complete some attempts to see trends</div>
                )}
              </div>
            </div>

            {/* Best Performers */}
            <div className="chart-card">
              <div className="chart-card-header">
                <h3>Top Improvements</h3>
                <span className="chart-badge secondary">Progress</span>
              </div>
              <div className="best-performers">
                {analyticsData.bestPerformers.length > 0 ? (
                  analyticsData.bestPerformers.map((task, index) => (
                    <div key={index} className="performer-item">
                      <div className="performer-rank">#{index + 1}</div>
                      <div className="performer-info">
                        <span className="performer-name">{task.name}</span>
                        <span className="performer-attempts">{task.attempts} attempts</span>
                      </div>
                      <div className="performer-improvement">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                          <polyline points="17 6 23 6 23 12"/>
                        </svg>
                        {task.improvement}%
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="chart-no-data small">Complete multiple attempts on tasks to see improvements</div>
                )}
              </div>
            </div>
          </>
        )}

        {activeChart === 'time' && (
          <>
            {/* Time per Task */}
            <div className="chart-card wide">
              <div className="chart-card-header">
                <h3>Total Time by Task</h3>
                <span className="chart-badge">Top 5</span>
              </div>
              <div className="chart-container">
                {analyticsData.timePerTask.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={analyticsData.timePerTask}>
                      <defs>
                        <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.secondary} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={COLORS.secondary} stopOpacity={0.4}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                      <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                      <YAxis 
                        stroke="var(--text-muted)" 
                        fontSize={12}
                        tickFormatter={(value) => formatTime(value)}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey="totalTime" 
                        fill="url(#colorBar)"
                        radius={[4, 4, 0, 0]}
                        name="Total Time"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-no-data">Complete some tasks to see time analysis</div>
                )}
              </div>
            </div>

            {/* Best Times Comparison */}
            <div className="chart-card">
              <div className="chart-card-header">
                <h3>Best Times Comparison</h3>
                <span className="chart-badge warning">Records</span>
              </div>
              <div className="chart-container">
                {analyticsData.timePerTask.filter(t => t.bestTime > 0).length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={analyticsData.timePerTask.filter(t => t.bestTime > 0)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                      <XAxis 
                        type="number" 
                        stroke="var(--text-muted)" 
                        fontSize={12}
                        tickFormatter={(value) => formatTime(value)}
                      />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        stroke="var(--text-muted)" 
                        fontSize={11}
                        width={80}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey="bestTime" 
                        fill={COLORS.warning}
                        radius={[0, 4, 4, 0]}
                        name="Best Time"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-no-data">Complete tasks to see best times</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Analytics;
