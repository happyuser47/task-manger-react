import React, { useState } from 'react';
import { formatTime } from '../hooks/useTaskManager';

const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
);

const PauseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16"/>
    <rect x="14" y="4" width="4" height="16"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M23 4v6h-6"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
);

const ChevronIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const TaskCard = ({ 
  task, 
  onStart, 
  onStop, 
  onComplete, 
  onRestart, 
  onDelete,
  onUpdate 
}) => {
  const [showAttempts, setShowAttempts] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(task.name);

  const getStatusClass = () => {
    if (task.isExceeding) return 'exceeding';
    if (task.status === 'running') return 'running';
    if (task.status === 'completed') return 'completed';
    return '';
  };

  const getStatusBadge = () => {
    if (task.isExceeding) {
      return <span className="task-status status-exceeding">Exceeding Best</span>;
    }
    switch (task.status) {
      case 'running':
        return <span className="task-status status-running">● Running</span>;
      case 'completed':
        return <span className="task-status status-completed">✓ Completed</span>;
      default:
        return <span className="task-status status-idle">○ Ready</span>;
    }
  };

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete(task.id);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  const handleEdit = () => {
    setEditName(task.name);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (editName.trim() && editName.trim() !== task.name) {
      onUpdate(task.id, editName.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName(task.name);
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const getProgressWidth = () => {
    if (!task.bestTime || task.bestTime === 0) return 0;
    const progress = (task.currentTime / task.bestTime) * 100;
    return Math.min(progress, 100);
  };

  return (
    <div className={`task-card ${getStatusClass()}`}>
      <div className="task-header">
        <div className="task-info">
          {isEditing ? (
            <div className="task-edit-form">
              <input
                type="text"
                className="task-edit-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
              <button 
                className="btn btn-success btn-xs"
                onClick={handleSaveEdit}
                title="Save"
              >
                <CheckIcon />
              </button>
              <button 
                className="btn btn-secondary btn-xs"
                onClick={handleCancelEdit}
                title="Cancel"
              >
                <CloseIcon />
              </button>
            </div>
          ) : (
            <>
              <h3 className="task-name" onDoubleClick={handleEdit}>{task.name}</h3>
              <button 
                className="task-edit-btn"
                onClick={handleEdit}
                title="Edit task name"
              >
                <EditIcon />
              </button>
            </>
          )}
          {!isEditing && getStatusBadge()}
        </div>
        
        {!isEditing && (
          confirmDelete ? (
            <div className="delete-confirm">
              <span className="delete-confirm-text">Delete?</span>
              <button 
                className="btn btn-danger btn-sm"
                onClick={handleDelete}
              >
                Yes
              </button>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => setConfirmDelete(false)}
              >
                No
              </button>
            </div>
          ) : (
            <button 
              className="task-delete" 
              onClick={handleDelete}
              title="Delete task"
            >
              <TrashIcon />
            </button>
          )
        )}
      </div>

      <div className="task-body">
        <div className="timer-section">
          <div className="timer-display">
            <span className="timer-label">Current</span>
            <span className={`timer-value ${task.status === 'running' ? 'running' : ''} ${task.isExceeding ? 'exceeding' : ''}`}>
              {formatTime(task.currentTime)}
            </span>
          </div>
          
          <div className="timer-display">
            <span className="timer-label">Best</span>
            <span className="timer-value best">
              {task.bestTime !== null ? formatTime(task.bestTime) : '--:--'}
            </span>
          </div>
          
          <div className="timer-display">
            <span className="timer-label">Attempts</span>
            <span className="timer-value">
              {task.attempts.length}
            </span>
          </div>
        </div>

        <div className="task-actions">
          {task.status === 'idle' && (
            <button 
              className="btn btn-success btn-sm"
              onClick={() => onStart(task.id)}
            >
              <PlayIcon /> Start
            </button>
          )}
          
          {task.status === 'running' && (
            <>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => onStop(task.id)}
              >
                <PauseIcon /> Pause
              </button>
              <button 
                className="btn btn-success btn-sm"
                onClick={() => onComplete(task.id)}
              >
                <CheckIcon /> Complete
              </button>
            </>
          )}
          
          {task.status === 'completed' && (
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => onRestart(task.id)}
            >
              <RefreshIcon /> Restart
            </button>
          )}
        </div>
      </div>

      {/* Progress bar for running tasks with best time */}
      {task.status === 'running' && task.bestTime !== null && (
        <div className="progress-bar">
          <div 
            className={`progress-fill ${task.isExceeding ? 'exceeding' : ''}`}
            style={{ width: `${getProgressWidth()}%` }}
          />
        </div>
      )}

      {/* Attempt History */}
      {task.attempts.length > 0 && (
        <div className="attempt-history">
          <button 
            className={`attempt-toggle ${showAttempts ? 'open' : ''}`}
            onClick={() => setShowAttempts(!showAttempts)}
          >
            <ChevronIcon />
            View {task.attempts.length} attempt{task.attempts.length > 1 ? 's' : ''}
          </button>
          
          {showAttempts && (
            <div className="attempt-list">
              {task.attempts.map((time, index) => (
                <div key={index} className="attempt-item">
                  <span className="attempt-number">Attempt #{index + 1}</span>
                  <span className={`attempt-time ${time === task.bestTime ? 'best' : ''}`}>
                    {formatTime(time)}
                    {time === task.bestTime && ' ★'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskCard;
