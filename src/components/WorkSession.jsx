import React, { useState } from 'react';
import { useWorkSession, formatDuration, formatTime } from '../hooks/useWorkSession';
import './WorkSession.css';

const ClockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

const CheckInIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
    <polyline points="10 17 15 12 10 7"/>
    <line x1="15" y1="12" x2="3" y2="12"/>
  </svg>
);

const CheckOutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const HistoryIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 10"/>
  </svg>
);

const WorkSession = () => {
  const {
    currentSession,
    sessionDuration,
    todaySessions,
    loading,
    isCheckedIn,
    checkIn,
    checkOut,
    getTotalTimeToday,
  } = useWorkSession();

  const [showHistory, setShowHistory] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckIn = async () => {
    setIsProcessing(true);
    await checkIn();
    setIsProcessing(false);
  };

  const handleCheckOut = async () => {
    setIsProcessing(true);
    await checkOut();
    setIsProcessing(false);
  };

  if (loading) {
    return (
      <div className="work-session">
        <div className="work-session-loading">
          <div className="mini-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="work-session">
      {isCheckedIn ? (
        <div className="session-active">
          <div className="session-info">
            <div className="session-status">
              <span className="status-dot active"></span>
              <span className="status-text">Working</span>
            </div>
            <div className="session-timer">
              <ClockIcon />
              <span className="timer-text">{formatDuration(sessionDuration)}</span>
            </div>
            <div className="session-checkin-time">
              In: {formatTime(currentSession?.check_in)}
            </div>
          </div>
          <button 
            className="btn-checkout"
            onClick={handleCheckOut}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <div className="mini-spinner"></div>
            ) : (
              <>
                <CheckOutIcon />
                <span>Check Out</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="session-inactive">
          <button 
            className="btn-checkin"
            onClick={handleCheckIn}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <div className="mini-spinner"></div>
            ) : (
              <>
                <CheckInIcon />
                <span>Check In</span>
              </>
            )}
          </button>
        </div>
      )}

      <button 
        className="btn-history"
        onClick={() => setShowHistory(!showHistory)}
        title="Today's Sessions"
      >
        <HistoryIcon />
      </button>

      {showHistory && (
        <div className="session-history-dropdown">
          <div className="history-header">
            <h4>Today's Sessions</h4>
            <div className="total-time">
              Total: <strong>{formatDuration(getTotalTimeToday())}</strong>
            </div>
          </div>
          
          {todaySessions.length === 0 ? (
            <div className="history-empty">
              <p>No sessions today</p>
            </div>
          ) : (
            <div className="history-list">
              {todaySessions.map((session, index) => {
                const isActive = !session.check_out;
                const checkInTime = new Date(session.check_in).getTime();
                const checkOutTime = session.check_out 
                  ? new Date(session.check_out).getTime() 
                  : Date.now();
                const duration = Math.floor((checkOutTime - checkInTime) / 1000);
                
                return (
                  <div key={session.id} className={`history-item ${isActive ? 'active' : ''}`}>
                    <div className="history-item-times">
                      <span className="history-in">{formatTime(session.check_in)}</span>
                      <span className="history-separator">→</span>
                      <span className="history-out">
                        {session.check_out ? formatTime(session.check_out) : 'Now'}
                      </span>
                    </div>
                    <div className="history-item-duration">
                      {isActive && <span className="live-dot"></span>}
                      {formatDuration(isActive ? sessionDuration : duration)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkSession;
