import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
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

const formatYAxis = (seconds) => {
  if (seconds === 0) return '0';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h${mins > 0 ? ` ${mins}m` : ''}`;
  if (mins > 0) return `${mins}m`;
  return `${seconds}s`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-label" style={{ fontWeight: '600', marginBottom: '8px' }}>{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="chart-tooltip-value" style={{ color: entry.color, margin: 0 }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: entry.color, borderRadius: '50%', marginRight: '6px' }}></span>
            {entry.name}: <strong>{formatTime(entry.value)}</strong>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const Analytics = ({ sessions }) => {
  const [activeTab, setActiveTab] = useState('daily');

  const analyticsData = useMemo(() => {
    // Basic formatting helpers
    const validSessions = (sessions || []).filter(s => s.check_out && s.duration);

    // 1. Daily Data (Last 14 days)
    const dailyMap = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dailyMap[key] = {
        name: d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
        date: d,
        workTime: 0
      };
    }

    // 2. Weekly Data (Last 12 weeks)
    const weeklyMap = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - (i * 7));
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
      const startOfWeek = new Date(d.setDate(diff));
      startOfWeek.setHours(0, 0, 0, 0);
      const key = startOfWeek.toISOString().split('T')[0];
      weeklyMap[key] = {
        name: `Wk of ${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        date: startOfWeek,
        workTime: 0
      };
    }

    // 3. Monthly Data (Last 12 months)
    const monthlyMap = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today);
      d.setMonth(d.getMonth() - i);
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap[key] = {
        name: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        date: d,
        workTime: 0
      };
    }

    // Aggregate Data
    let totalWorkTime = 0;

    validSessions.forEach(session => {
      const sessionDate = new Date(session.check_in);
      const duration = session.duration || 0;
      totalWorkTime += duration;

      // Daily
      const dayKey = sessionDate.toISOString().split('T')[0];
      if (dailyMap[dayKey]) dailyMap[dayKey].workTime += duration;

      // Weekly
      const day = sessionDate.getDay();
      const diff = sessionDate.getDate() - day + (day === 0 ? -6 : 1);
      const startOfWeek = new Date(new Date(sessionDate).setDate(diff));
      startOfWeek.setHours(0, 0, 0, 0);
      const weekKey = startOfWeek.toISOString().split('T')[0];
      if (weeklyMap[weekKey]) weeklyMap[weekKey].workTime += duration;

      // Monthly
      const monthKey = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyMap[monthKey]) monthlyMap[monthKey].workTime += duration;
    });

    return {
      daily: Object.values(dailyMap),
      weekly: Object.values(weeklyMap),
      monthly: Object.values(monthlyMap),
      summary: {
        totalSessions: validSessions.length,
        totalWorkTime,
        avgSessionLength: validSessions.length > 0 ? Math.floor(totalWorkTime / validSessions.length) : 0
      }
    };
  }, [sessions]);

  const hasData = analyticsData.summary.totalSessions > 0;

  if (!hasData) {
    return (
      <div className="analytics-section">
        <div className="analytics-header">
          <div className="analytics-title">
            <div className="analytics-icon">📊</div>
            <div>
              <h2>Session Analytics</h2>
              <p>Insights into your focus and work time</p>
            </div>
          </div>
        </div>
        <div className="analytics-empty">
          <div className="analytics-empty-icon">📈</div>
          <h3>No Session Data Yet</h3>
          <p>Check in and complete some work sessions to see your progress.</p>
        </div>
      </div>
    );
  }

  // Get active dataset
  const currentData = analyticsData[activeTab] || analyticsData.daily;

  return (
    <div className="analytics-section">
      <div className="analytics-header">
        <div className="analytics-title">
          <div className="analytics-icon">📈</div>
          <div>
            <h2>Session Analytics</h2>
            <p>Your productivity across different timeframes</p>
          </div>
        </div>

        <div className="chart-tabs">
          <button
            className={`chart-tab ${activeTab === 'daily' ? 'active' : ''}`}
            onClick={() => setActiveTab('daily')}
          >
            Daily Progress
          </button>
          <button
            className={`chart-tab ${activeTab === 'weekly' ? 'active' : ''}`}
            onClick={() => setActiveTab('weekly')}
          >
            Weekly Trend
          </button>
          <button
            className={`chart-tab ${activeTab === 'monthly' ? 'active' : ''}`}
            onClick={() => setActiveTab('monthly')}
          >
            Monthly Overview
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="analytics-summary">
        <div className="summary-card" style={{ flex: 1, minWidth: '200px' }}>
          <div className="summary-icon time">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="summary-content">
            <span className="summary-value" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              {formatTime(analyticsData.summary.totalWorkTime)}
            </span>
            <span className="summary-label" style={{ color: 'var(--text-muted)' }}>Total Focus Time</span>
          </div>
        </div>

        <div className="summary-card" style={{ flex: 1, minWidth: '200px' }}>
          <div className="summary-icon attempts">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className="summary-content">
            <span className="summary-value" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              {analyticsData.summary.totalSessions}
            </span>
            <span className="summary-label" style={{ color: 'var(--text-muted)' }}>Total Check-Ins</span>
          </div>
        </div>

        <div className="summary-card" style={{ flex: 1, minWidth: '200px' }}>
          <div className="summary-icon completion">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="summary-content">
            <span className="summary-value" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              {formatTime(analyticsData.summary.avgSessionLength)}
            </span>
            <span className="summary-label" style={{ color: 'var(--text-muted)' }}>Average Session Length</span>
          </div>
        </div>
      </div>

      {/* Main Charts */}
      <div className="charts-grid" style={{ marginTop: '24px' }}>
        {/* Trend Area Chart */}
        <div className="chart-card wide" style={{ marginBottom: '24px' }}>
          <div className="chart-card-header" style={{ marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>Focus Time Progression</h3>
            <span className="chart-badge primary" style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', color: COLORS.primary, padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600' }}>
              {activeTab === 'daily' ? 'Past 14 Days' : activeTab === 'weekly' ? 'Past 12 Weeks' : 'Past 12 Months'}
            </span>
          </div>
          <div className="chart-container" style={{ minHeight: '320px', width: '100%' }}>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={currentData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorWorkTimeArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.5} />
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="var(--border-subtle)" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="var(--text-muted)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={12}
                  minTickGap={20}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  fontSize={11}
                  tickFormatter={formatYAxis}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={12}
                  width={50}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border-light)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area
                  type="monotone"
                  dataKey="workTime"
                  stroke={COLORS.primary}
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorWorkTimeArea)"
                  name="Session Time"
                  activeDot={{ r: 6, strokeWidth: 0, fill: COLORS.primary }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Volume Bar Chart */}
        <div className="chart-card wide">
          <div className="chart-card-header" style={{ marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>Volume Breakdown</h3>
            <span className="chart-badge secondary" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: COLORS.secondary, padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600' }}>
              Consistency Check
            </span>
          </div>
          <div className="chart-container" style={{ minHeight: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={currentData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.secondary} stopOpacity={0.9} />
                    <stop offset="95%" stopColor={COLORS.secondary} stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="var(--border-subtle)" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="var(--text-muted)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={12}
                  minTickGap={20}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  fontSize={11}
                  tickFormatter={formatYAxis}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={12}
                  width={50}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-tertiary)', opacity: 0.4 }} />
                <Bar
                  dataKey="workTime"
                  fill="url(#colorBar)"
                  radius={[6, 6, 0, 0]}
                  name="Session Time"
                  maxBarSize={45}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
