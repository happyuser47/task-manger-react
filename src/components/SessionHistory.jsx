import React, { useState, useEffect, useMemo } from 'react';
import { useWorkSessionContext } from '../contexts/WorkSessionContext';
import { formatDuration, formatTime } from '../hooks/useWorkSession';
import './SessionHistory.css';

// Icons
const CalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const TrendingUpIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const NoteIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const TargetIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const SessionHistory = () => {
  const {
    allSessions,
    sessionStats,
    historyLoading,
    fetchSessionHistory,
    deleteSession,
    deleteSessionsInRange,
  } = useWorkSessionContext();

  const [activeFilter, setActiveFilter] = useState('week');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showClearMenu, setShowClearMenu] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowClearMenu(false);
    if (showClearMenu) {
      window.addEventListener('click', handleClickOutside);
    }
    return () => window.removeEventListener('click', handleClickOutside);
  }, [showClearMenu]);

  // Fetch sessions on mount and filter change
  useEffect(() => {
    fetchSessionHistory(activeFilter);
  }, [activeFilter, fetchSessionHistory]);

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
  };

  const handleRefresh = () => {
    fetchSessionHistory(activeFilter);
  };

  const handleDeleteClick = (sessionId) => {
    setDeleteConfirm(sessionId);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;

    setIsDeleting(true);
    const result = await deleteSession(deleteConfirm);
    setIsDeleting(false);

    if (result.success) {
      setDeleteConfirm(null);
    } else {
      // If delete failed, refresh to get current state
      console.error('Delete failed:', result.error);
      setDeleteConfirm(null);
      fetchSessionHistory(activeFilter);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm(null);
  };

  const handleBulkDeleteClick = (range) => {
    setBulkDeleteConfirm(range);
    setShowClearMenu(false);
  };

  const handleBulkDeleteConfirm = async () => {
    if (!bulkDeleteConfirm) return;

    setIsDeleting(true);
    const result = await deleteSessionsInRange(bulkDeleteConfirm);
    setIsDeleting(false);

    if (result.success) {
      setBulkDeleteConfirm(null);
    } else {
      console.error('Bulk delete failed:', result.error);
      setBulkDeleteConfirm(null);
    }
  };

  const handleBulkDeleteCancel = () => {
    setBulkDeleteConfirm(null);
  };

  // Group sessions by date
  const groupedSessions = useMemo(() => {
    return allSessions.reduce((groups, session) => {
      const date = new Date(session.check_in).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      if (!groups[date]) {
        groups[date] = {
          sessions: [],
          totalTime: 0
        };
      }
      groups[date].sessions.push(session);

      if (session.check_out) {
        const checkIn = new Date(session.check_in).getTime();
        const checkOut = new Date(session.check_out).getTime();
        groups[date].totalTime += Math.floor((checkOut - checkIn) / 1000);
      }

      return groups;
    }, {});
  }, [allSessions]);

  const filterLabels = {
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    all: 'All Time'
  };

  return (
    <div className="session-history">
      {/* Header Section */}
      <div className="history-page-header">
        <div className="history-title-section">
          <h2 className="history-page-title">
            <CalendarIcon />
            Work Session History
          </h2>
          <p className="history-subtitle">Track and manage your work sessions</p>
        </div>
        <div className="history-actions">
          <div className="clear-history-container">
            <button
              className="btn-clear-history"
              onClick={(e) => {
                e.stopPropagation();
                setShowClearMenu(!showClearMenu);
              }}
              disabled={allSessions.length === 0}
            >
              <TrashIcon />
              Clear History
            </button>

            {showClearMenu && (
              <div className="clear-menu" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => handleBulkDeleteClick('today')}>Today's Sessions</button>
                <button onClick={() => handleBulkDeleteClick('week')}>Last 7 Days</button>
                <button onClick={() => handleBulkDeleteClick('month')}>Last 30 Days</button>
                <button onClick={() => handleBulkDeleteClick('all')} className="clear-all">Clear All History</button>
              </div>
            )}
          </div>

          <button
            className="btn-refresh"
            onClick={handleRefresh}
            disabled={historyLoading}
            title="Refresh"
          >
            <RefreshIcon />
          </button>
        </div>
      </div>

      {/* Bulk Delete Confirmation Modal */}
      {bulkDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content bulk-delete-modal">
            <div className="modal-icon warning">
              <TrashIcon />
            </div>
            <h3>Confirm Batch Deletion</h3>
            <p>
              Are you sure you want to delete <strong>{
                bulkDeleteConfirm === 'today' ? "today's" :
                  bulkDeleteConfirm === 'week' ? "this week's" :
                    bulkDeleteConfirm === 'month' ? "this month's" :
                      "all"
              }</strong> work sessions? This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                className="btn-modal-confirm danger"
                onClick={handleBulkDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
              <button
                className="btn-modal-cancel"
                onClick={handleBulkDeleteCancel}
                disabled={isDeleting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="history-stats-grid">
        <div className="history-stat-card">
          <div className="stat-icon sessions">
            <CheckCircleIcon />
          </div>
          <div className="stat-content">
            <span className="stat-value">{sessionStats.totalSessions}</span>
            <span className="stat-label">Total Sessions</span>
          </div>
        </div>
        <div className="history-stat-card">
          <div className="stat-icon time">
            <ClockIcon />
          </div>
          <div className="stat-content">
            <span className="stat-value">{formatDuration(sessionStats.totalTime)}</span>
            <span className="stat-label">Total Time</span>
          </div>
        </div>
        <div className="history-stat-card">
          <div className="stat-icon average">
            <TargetIcon />
          </div>
          <div className="stat-content">
            <span className="stat-value">{formatDuration(sessionStats.avgSessionTime)}</span>
            <span className="stat-label">Avg. Session</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="history-filter-section">
        <div className="filter-tabs">
          {Object.entries(filterLabels).map(([key, label]) => (
            <button
              key={key}
              className={`filter-tab ${activeFilter === key ? 'active' : ''}`}
              onClick={() => handleFilterChange(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions List */}
      <div className="history-content">
        {historyLoading ? (
          <div className="history-loading-state">
            <div className="loading-spinner"></div>
            <p>Loading sessions...</p>
          </div>
        ) : allSessions.length === 0 ? (
          <div className="history-empty-state">
            <div className="empty-icon">
              <CalendarIcon />
            </div>
            <h3>No Sessions Found</h3>
            <p>No work sessions recorded for {filterLabels[activeFilter].toLowerCase()}.</p>
          </div>
        ) : (
          <div className="sessions-list">
            {Object.entries(groupedSessions).map(([date, { sessions, totalTime }]) => (
              <div key={date} className="date-group">
                <div className="date-header">
                  <div className="date-info">
                    <span className="date-text">{date}</span>
                    <span className="date-count">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="date-total">
                    <ClockIcon />
                    <span>{formatDuration(totalTime)}</span>
                  </div>
                </div>
                <div className="date-sessions">
                  {sessions.map((session) => {
                    const checkInTime = new Date(session.check_in).getTime();
                    const checkOutTime = new Date(session.check_out).getTime();
                    const duration = Math.floor((checkOutTime - checkInTime) / 1000);

                    return (
                      <div key={session.id} className="session-card">
                        <div className="session-main">
                          <div className="session-times">
                            <div className="time-block">
                              <span className="time-label">Check In</span>
                              <span className="time-value in">{formatTime(session.check_in)}</span>
                            </div>
                            <div className="time-arrow">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="5" y1="12" x2="19" y2="12" />
                                <polyline points="12 5 19 12 12 19" />
                              </svg>
                            </div>
                            <div className="time-block">
                              <span className="time-label">Check Out</span>
                              <span className="time-value out">{formatTime(session.check_out)}</span>
                            </div>
                          </div>
                          <div className="session-duration">
                            <span className="duration-value">{formatDuration(duration)}</span>
                          </div>
                          <button
                            className="btn-delete-session"
                            onClick={() => handleDeleteClick(session.id)}
                            title="Delete session"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                        {session.reason && (
                          <div className="session-reason">
                            <NoteIcon />
                            <span>{session.reason}</span>
                          </div>
                        )}

                        {/* Delete Confirmation */}
                        {deleteConfirm === session.id && (
                          <div className="delete-confirm-overlay">
                            <div className="delete-confirm-content">
                              <p>Delete this session?</p>
                              <div className="delete-confirm-actions">
                                <button
                                  className="btn-confirm-delete"
                                  onClick={handleDeleteConfirm}
                                  disabled={isDeleting}
                                >
                                  {isDeleting ? 'Deleting...' : 'Delete'}
                                </button>
                                <button
                                  className="btn-cancel-delete"
                                  onClick={handleDeleteCancel}
                                  disabled={isDeleting}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionHistory;
