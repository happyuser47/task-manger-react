import React, { useState } from 'react';
import { useWorkSessionContext } from '../contexts/WorkSessionContext';
import { formatDuration, formatTime } from '../hooks/useWorkSession';
import './WorkSession.css';

const ClockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const CheckInIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <polyline points="10 17 15 12 10 7" />
    <line x1="15" y1="12" x2="3" y2="12" />
  </svg>
);

const CheckOutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const HistoryIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 10" />
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const NoteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

// Checkout Modal Component
const CheckoutModal = ({ isOpen, onClose, onConfirm, sessionDuration, isProcessing }) => {
  const [reason, setReason] = useState('');
  const [selectedQuickOption, setSelectedQuickOption] = useState('');

  const quickOptions = [
    'Completed daily tasks',
    'End of shift',
    'Namaz',
    'Break time',
    'Meeting/Call',
    'Lunch break',
    'Personal errand',
    'Technical issues',
    'Other'
  ];

  const handleQuickSelect = (option) => {
    if (option === 'Other') {
      setSelectedQuickOption(option);
      setReason('');
    } else {
      setSelectedQuickOption(option);
      setReason(option);
    }
  };

  const handleConfirm = () => {
    onConfirm(reason);
    setReason('');
    setSelectedQuickOption('');
  };

  const handleClose = () => {
    setReason('');
    setSelectedQuickOption('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="checkout-modal-overlay" onClick={handleClose}>
      <div className="checkout-modal" onClick={(e) => e.stopPropagation()}>
        <div className="checkout-modal-header">
          <div className="checkout-modal-title">
            <CheckOutIcon />
            <h3>End Work Session</h3>
          </div>
          <button className="checkout-modal-close" onClick={handleClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="checkout-modal-body">
          <div className="session-summary">
            <div className="summary-item">
              <span className="summary-label">Session Duration</span>
              <span className="summary-value">{formatDuration(sessionDuration)}</span>
            </div>
          </div>

          <div className="reason-section">
            <label className="reason-label">
              <NoteIcon />
              <span>What did you work on? <span className="optional-tag">(Optional)</span></span>
            </label>

            <div className="quick-options">
              {quickOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`quick-option ${selectedQuickOption === option ? 'selected' : ''}`}
                  onClick={() => handleQuickSelect(option)}
                >
                  {option}
                </button>
              ))}
            </div>

            <textarea
              className="reason-textarea"
              placeholder="Add more details about your work session..."
              value={selectedQuickOption === 'Other' || !quickOptions.includes(reason) ? reason : ''}
              onChange={(e) => {
                setReason(e.target.value);
                if (e.target.value && selectedQuickOption !== 'Other') {
                  setSelectedQuickOption('');
                }
              }}
              rows={3}
              disabled={selectedQuickOption && selectedQuickOption !== 'Other'}
            />
          </div>
        </div>

        <div className="checkout-modal-footer">
          <button className="btn-cancel" onClick={handleClose} disabled={isProcessing}>
            Cancel
          </button>
          <button className="btn-confirm-checkout" onClick={handleConfirm} disabled={isProcessing}>
            {isProcessing ? (
              <div className="mini-spinner"></div>
            ) : (
              <>
                <CheckOutIcon />
                <span>Confirm Check Out</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

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
  } = useWorkSessionContext();

  const [showHistory, setShowHistory] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckIn = async () => {
    setIsProcessing(true);
    await checkIn();
    setIsProcessing(false);
  };

  const handleCheckOutClick = () => {
    setShowCheckoutModal(true);
  };

  const handleCheckOutConfirm = async (reason) => {
    setIsProcessing(true);
    await checkOut(reason);
    setIsProcessing(false);
    setShowCheckoutModal(false);
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
            onClick={handleCheckOutClick}
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
              {todaySessions.map((session) => {
                const isActive = !session.check_out;
                const checkInTime = new Date(session.check_in).getTime();
                const checkOutTime = session.check_out
                  ? new Date(session.check_out).getTime()
                  : Date.now();
                const duration = Math.floor((checkOutTime - checkInTime) / 1000);

                return (
                  <div key={session.id} className={`history-item ${isActive ? 'active' : ''}`}>
                    <div className="history-item-content">
                      <div className="history-item-times">
                        <span className="history-in">{formatTime(session.check_in)}</span>
                        <span className="history-separator">→</span>
                        <span className="history-out">
                          {session.check_out ? formatTime(session.check_out) : 'Now'}
                        </span>
                      </div>
                      {session.reason && (
                        <div className="history-item-reason">
                          <NoteIcon />
                          <span>{session.reason}</span>
                        </div>
                      )}
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

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        onConfirm={handleCheckOutConfirm}
        sessionDuration={sessionDuration}
        isProcessing={isProcessing}
      />
    </div>
  );
};

export default WorkSession;
