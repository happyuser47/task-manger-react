import React from 'react';
import { formatTime } from '../hooks/useTaskManager';

const Stats = ({ stats }) => {
  return (
    <div className="stats-container">
      <div className="stat-card">
        <div className="stat-icon total">📋</div>
        <div className="stat-value">{stats.total}</div>
        <div className="stat-label">Total Tasks</div>
      </div>
      <div className="stat-card">
        <div className="stat-icon progress">⏳</div>
        <div className="stat-value">{stats.inProgress}</div>
        <div className="stat-label">In Progress</div>
      </div>
      <div className="stat-card">
        <div className="stat-icon completed">✓</div>
        <div className="stat-value">{stats.completed}</div>
        <div className="stat-label">Completed</div>
      </div>
      <div className="stat-card">
        <div className="stat-icon time">⏱</div>
        <div className="stat-value">{formatTime(stats.totalTime)}</div>
        <div className="stat-label">Total Time</div>
      </div>
    </div>
  );
};

export default Stats;
