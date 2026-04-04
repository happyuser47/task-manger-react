import React, { useState, useMemo, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { formatTime } from '../hooks/useTaskManager';
import { useSettingsContext } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';

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
  const { getLocalTime } = useSettingsContext();
  const { user } = useAuth();
  const [focusSessions, setFocusSessions] = useState([]);

  useEffect(() => {
    if (!user) return;
    const fetchFocus = async () => {
      const { data } = await supabase.from('pomodoro_sessions').select('*').eq('user_id', user.id);
      if (data) setFocusSessions(data);
    };
    fetchFocus();
  }, [user]);

  const analyticsData = useMemo(() => {
    // Basic formatting helpers
    const validSessions = (sessions || []).filter(s => s.check_out && s.duration);
    const validFocus = focusSessions || [];

    const getLocalKey = (date) => {
      const d = getLocalTime(date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // 1. Daily Data (Last 14 days)
    const dailyMap = {};
    const today = getLocalTime();
    today.setHours(0, 0, 0, 0);

    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dailyMap[key] = {
        name: d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
        date: d,
        workTime: 0,
        focusTime: 0
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
      const key = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`;
      weeklyMap[key] = {
        name: `Wk of ${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        date: startOfWeek,
        workTime: 0,
        focusTime: 0
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
        workTime: 0,
        focusTime: 0
      };
    }

    // Aggregate Data
    let totalWorkTime = 0;
    let totalFocusTime = 0;

    validSessions.forEach(session => {
      const sessionDate = new Date(session.check_in);
      const localSessionDate = getLocalTime(sessionDate);
      const duration = session.duration || 0;
      totalWorkTime += duration;

      // Daily
      const dayKey = `${localSessionDate.getFullYear()}-${String(localSessionDate.getMonth() + 1).padStart(2, '0')}-${String(localSessionDate.getDate()).padStart(2, '0')}`;
      if (dailyMap[dayKey]) dailyMap[dayKey].workTime += duration;

      // Weekly
      const day = localSessionDate.getDay();
      const diff = localSessionDate.getDate() - day + (day === 0 ? -6 : 1);
      const startOfWeek = new Date(new Date(localSessionDate).setDate(diff));
      startOfWeek.setHours(0, 0, 0, 0);
      const weekKey = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`;
      if (weeklyMap[weekKey]) weeklyMap[weekKey].workTime += duration;

      // Monthly
      const monthKey = `${localSessionDate.getFullYear()}-${String(localSessionDate.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyMap[monthKey]) monthlyMap[monthKey].workTime += duration;
    });

    validFocus.forEach(session => {
      const sessionDate = new Date(session.completed_at);
      const localSessionDate = getLocalTime(sessionDate);
      const duration = session.duration || 0;
      totalFocusTime += duration;

      // Daily
      const dayKey = `${localSessionDate.getFullYear()}-${String(localSessionDate.getMonth() + 1).padStart(2, '0')}-${String(localSessionDate.getDate()).padStart(2, '0')}`;
      if (dailyMap[dayKey]) dailyMap[dayKey].focusTime += duration;

      // Weekly
      const day = localSessionDate.getDay();
      const diff = localSessionDate.getDate() - day + (day === 0 ? -6 : 1);
      const startOfWeek = new Date(new Date(localSessionDate).setDate(diff));
      startOfWeek.setHours(0, 0, 0, 0);
      const weekKey = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`;
      if (weeklyMap[weekKey]) weeklyMap[weekKey].focusTime += duration;

      // Monthly
      const monthKey = `${localSessionDate.getFullYear()}-${String(localSessionDate.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyMap[monthKey]) monthlyMap[monthKey].focusTime += duration;
    });

    return {
      daily: Object.values(dailyMap),
      weekly: Object.values(weeklyMap),
      monthly: Object.values(monthlyMap),
      summary: {
        totalSessions: validSessions.length,
        totalWorkTime,
        totalFocusTime,
        avgSessionLength: validSessions.length > 0 ? Math.floor(totalWorkTime / validSessions.length) : 0
      }
    };
  }, [sessions, focusSessions]);

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
        <div className="summary-card">
          <div className="summary-icon time">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="summary-content">
            <span className="summary-value">
              {formatTime(analyticsData.summary.totalWorkTime)}
            </span>
            <span className="summary-label">Working Time</span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon time" style={{ backgroundColor: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="summary-content">
            <span className="summary-value" style={{ color: '#ec4899' }}>
              {formatTime(analyticsData.summary.totalFocusTime)}
            </span>
            <span className="summary-label">Focus Time</span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon attempts">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className="summary-content">
            <span className="summary-value">
              {analyticsData.summary.totalSessions}
            </span>
            <span className="summary-label">Total Check-Ins</span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon completion">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="summary-content">
            <span className="summary-value">
              {formatTime(analyticsData.summary.avgSessionLength)}
            </span>
            <span className="summary-label">Avg Session Length</span>
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
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={currentData} margin={{ top: 10, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorWorkTimeArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.5} />
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="colorFocusTimeArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="var(--border-subtle)" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="var(--text-muted)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={15}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="var(--text-muted)"
                  fontSize={10}
                  tickFormatter={formatYAxis}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={40}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border-light)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area
                  type="monotone"
                  dataKey="workTime"
                  stroke={COLORS.primary}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorWorkTimeArea)"
                  name="Working Time"
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 0, fill: COLORS.primary }}
                />
                <Area
                  type="monotone"
                  dataKey="focusTime"
                  stroke="#ec4899"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorFocusTimeArea)"
                  name="Focus Time"
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 0, fill: '#ec4899' }}
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
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={currentData} margin={{ top: 10, right: 5, left: 0, bottom: 0 }}>
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
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={15}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="var(--text-muted)"
                  fontSize={10}
                  tickFormatter={formatYAxis}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={40}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-tertiary)', opacity: 0.4 }} />
                <Bar
                  dataKey="workTime"
                  fill="url(#colorBar)"
                  radius={[4, 4, 0, 0]}
                  name="Session Time"
                  maxBarSize={35}
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
