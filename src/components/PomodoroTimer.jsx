import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSettingsContext } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import './PomodoroTimer.css';

const MODES = {
  focus: { label: 'Focus', duration: 25 * 60, color: '#8b5cf6' },
  shortBreak: { label: 'Short Break', duration: 5 * 60, color: '#10b981' },
  longBreak: { label: 'Long Break', duration: 15 * 60, color: '#3b82f6' },
};

const PomodoroTimer = ({ isOpen, onClose, task, tasks = [], onRunningChange, onStartTask, onStopTask }) => {
  const {
    pomodoroFocusDuration,
    pomodoroShortBreak,
    pomodoroLongBreak,
    pomodoroTickEnabled,
    pomodoroSessionsCompleted,
    updatePomodoroSettings,
    settingsLoaded,
  } = useSettingsContext();

  // Initialize state — use context values for persistent settings, localStorage for transient timer state
  const [mode, setMode] = useState(() => localStorage.getItem('pomodoro_mode') || 'focus');
  const [customDurations, setCustomDurations] = useState({
    focus: pomodoroFocusDuration,
    shortBreak: pomodoroShortBreak,
    longBreak: pomodoroLongBreak,
  });
  const [timeLeft, setTimeLeft] = useState(() => {
    const saved = localStorage.getItem('pomodoro_timeLeft');
    if (saved !== null) return parseInt(saved);
    return (pomodoroFocusDuration || 25) * 60;
  });
  const [isRunning, setIsRunning] = useState(() => localStorage.getItem('pomodoro_isRunning') === 'true');
  const [sessionsCompleted, setSessionsCompleted] = useState(pomodoroSessionsCompleted);
  const [showSettings, setShowSettings] = useState(false);
  const [tickEnabled, setTickEnabled] = useState(pomodoroTickEnabled);
  const [currentTaskName, setCurrentTaskName] = useState(() => localStorage.getItem('pomodoro_taskName') || '');
  const [currentTaskId, setCurrentTaskId] = useState(() => localStorage.getItem('pomodoro_taskId') || null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  
  const intervalRef = useRef(null);
  const audioContextRef = useRef(null);
  const tickEnabledRef = useRef(tickEnabled);

  // Sync refs
  const { user } = useAuth();
  const channelRef = useRef(null);
  const syncTimestampRef = useRef(0);
  const isBroadcastingRef = useRef(false);

  const broadcastState = useCallback((overrides) => {
    if (!channelRef.current || isBroadcastingRef.current) return;
    const now = Date.now();
    syncTimestampRef.current = now;
    
    channelRef.current.send({
      type: 'broadcast',
      event: 'timer_state',
      payload: {
        mode: overrides?.mode !== undefined ? overrides.mode : mode,
        timeLeft: overrides?.timeLeft !== undefined ? overrides.timeLeft : timeLeft,
        isRunning: overrides?.isRunning !== undefined ? overrides.isRunning : isRunning,
        currentTaskId: overrides?.currentTaskId !== undefined ? overrides.currentTaskId : currentTaskId,
        currentTaskName: overrides?.currentTaskName !== undefined ? overrides.currentTaskName : currentTaskName,
        timestamp: now
      }
    }).catch(err => console.log('Broadcast error:', err));
  }, [mode, timeLeft, isRunning, currentTaskId, currentTaskName]);

  // Connect to Supabase Broadcast channel
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(`pomodoro_sync_${user.id}`, {
      config: { broadcast: { self: false } }
    });
    
    channel
      .on('broadcast', { event: 'timer_state' }, (payload) => {
        const data = payload.payload;
        if (data.timestamp <= syncTimestampRef.current) return;
        
        syncTimestampRef.current = data.timestamp;
        isBroadcastingRef.current = true;
        
        setMode(data.mode);
        setIsRunning(data.isRunning);
        
        if (data.currentTaskId !== undefined) {
           setCurrentTaskId(data.currentTaskId);
           setCurrentTaskName(data.currentTaskName);
        }

        let newTimeLeft = data.timeLeft;
        if (data.isRunning) {
          const elapsed = Math.floor((Date.now() - data.timestamp) / 1000);
          newTimeLeft = Math.max(0, newTimeLeft - elapsed);
        }
        setTimeLeft(newTimeLeft);
        
        setTimeout(() => {
           isBroadcastingRef.current = false;
        }, 300);
      })
      .on('broadcast', { event: 'request_sync' }, () => {
         // Send our local state to the newly joined tab
         broadcastState();
      })
      .subscribe((status) => {
         if (status === 'SUBSCRIBED') {
           channel.send({ type: 'broadcast', event: 'request_sync' });
         }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, broadcastState]);

  // Sync from context when settings load from Supabase (e.g. on login)
  useEffect(() => {
    if (settingsLoaded) {
      setCustomDurations({
        focus: pomodoroFocusDuration,
        shortBreak: pomodoroShortBreak,
        longBreak: pomodoroLongBreak,
      });
      setTickEnabled(pomodoroTickEnabled);
      setSessionsCompleted(pomodoroSessionsCompleted);
      
      // Update timeLeft if not running to reflect new settings
      if (!isRunning) {
        if (mode === 'focus') setTimeLeft(pomodoroFocusDuration * 60);
        else if (mode === 'shortBreak') setTimeLeft(pomodoroShortBreak * 60);
        else if (mode === 'longBreak') setTimeLeft(pomodoroLongBreak * 60);
      }
    }
  }, [settingsLoaded, pomodoroFocusDuration, pomodoroShortBreak, pomodoroLongBreak, pomodoroTickEnabled, pomodoroSessionsCompleted, isRunning, mode]);

  // Update task if provided and different
  useEffect(() => {
    if (task && task.id !== currentTaskId) {
      setCurrentTaskId(task.id);
      setCurrentTaskName(task.name);
      localStorage.setItem('pomodoro_taskId', task.id);
      localStorage.setItem('pomodoro_taskName', task.name);
    }
  }, [task, currentTaskId]);

  // Compute effective durations
  const getDuration = useCallback((m) => {
    return {
      focus: (customDurations.focus || 25) * 60,
      shortBreak: (customDurations.shortBreak || 5) * 60,
      longBreak: (customDurations.longBreak || 15) * 60,
    }[m];
  }, [customDurations]);

  // Handle persistence when values change
  useEffect(() => {
    localStorage.setItem('pomodoro_mode', mode);
    localStorage.setItem('pomodoro_timeLeft', timeLeft.toString());
    localStorage.setItem('pomodoro_isRunning', isRunning.toString());
    localStorage.setItem('pomodoro_taskId', currentTaskId || '');
    localStorage.setItem('pomodoro_taskName', currentTaskName || '');
    
    // Keep ref in sync for the interval callback
    tickEnabledRef.current = tickEnabled;
    
    // Notify parent about running state
    if (onRunningChange) {
      onRunningChange(isRunning);
    }
  }, [mode, timeLeft, isRunning, sessionsCompleted, customDurations, onRunningChange, currentTaskId, currentTaskName]);

  // Sync elapsed time on mount if it was running
  useEffect(() => {
    if (isRunning) {
      const lastTick = parseInt(localStorage.getItem('pomodoro_lastTick')) || Date.now();
      const elapsed = Math.floor((Date.now() - lastTick) / 1000);
      if (elapsed > 0) {
        setTimeLeft(prev => Math.max(0, prev - elapsed));
      }
    }
    
    // Set periodic tick update for persistence
    const ticker = setInterval(() => {
      if (isRunning) {
        localStorage.setItem('pomodoro_lastTick', Date.now().toString());
      }
    }, 1000);
    
    return () => clearInterval(ticker);
  }, []); // Run once on mount

  // Main Timer loop
  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      // Play tick sound if enabled and in focus mode (use ref for latest value)
      if (tickEnabledRef.current && mode === 'focus') {
        try {
          if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
          }
          const ctx = audioContextRef.current;
          if (ctx.state === 'suspended') ctx.resume();
          
          const now = ctx.currentTime;
          
          // Primary click - sharp high-frequency tap
          const osc1 = ctx.createOscillator();
          const gain1 = ctx.createGain();
          osc1.connect(gain1);
          gain1.connect(ctx.destination);
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(1200, now);
          osc1.frequency.exponentialRampToValueAtTime(600, now + 0.03);
          gain1.gain.setValueAtTime(0.15, now);
          gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
          osc1.start(now);
          osc1.stop(now + 0.06);
          
          // Secondary thud - warm low-frequency body
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(300, now + 0.01);
          gain2.gain.setValueAtTime(0.08, now + 0.01);
          gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          osc2.start(now + 0.01);
          osc2.stop(now + 0.08);
        } catch (e) { console.error("Audio error:", e); }
      }

      setTimeLeft(prev => {
        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null; // Prevents double execution in React StrictMode
            setTimeout(() => {
              setIsRunning(false);
              handleTimerComplete();
            }, 0);
          }
          return 0;
        }
        localStorage.setItem('pomodoro_lastTick', Date.now().toString());
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [isRunning, mode]);

  const switchMode = useCallback((newMode) => {
    // If we're leaving focus mode while running, stop task timer
    if (mode === 'focus' && isRunning && currentTaskId && onStopTask) {
      onStopTask(currentTaskId);
    }
    setMode(newMode);
    setTimeLeft(getDuration(newMode));
    setIsRunning(false);
    broadcastState({ mode: newMode, timeLeft: getDuration(newMode), isRunning: false });
  }, [getDuration, mode, isRunning, currentTaskId, onStopTask, broadcastState]);

  const handleTimerComplete = useCallback(() => {
    // Play notification sound
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 1000;
        gain2.gain.value = 0.3;
        osc2.start();
        osc2.stop(ctx.currentTime + 0.3);
      }, 400);
    } catch (e) { /* silent */ }

    if (mode === 'focus') {
      // Stop task timer when focus completes
      if (currentTaskId && onStopTask) {
        onStopTask(currentTaskId);
      }
      
      const newCount = sessionsCompleted + 1;
      setSessionsCompleted(newCount);
      updatePomodoroSettings({ sessionsCompleted: newCount });

      // Log Focus Session to analytics
      if (user) {
        const focusDuration = getDuration('focus');
        supabase.from('pomodoro_sessions').insert({
          user_id: user.id,
          duration: focusDuration,
          completed_at: new Date().toISOString()
        }).then(({ data, error }) => {
          if (error) {
            console.error('Failed to log pomodoro session:', error.message);
          } else {
            console.log('Pomodoro session logged:', focusDuration, 'seconds');
          }
        });
      }

      if (newCount % 4 === 0) {
        switchMode('longBreak');
      } else {
        switchMode('shortBreak');
      }
    } else {
      switchMode('focus');
    }
  }, [mode, sessionsCompleted, currentTaskId, onStopTask, switchMode, user, getDuration]);

  const toggleTimer = () => {
    // Resume audio context on user interaction to satisfy browser policies
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
    } catch (e) { /* silent */ }

    setIsRunning(prev => {
      const next = !prev;
      if (next) {
        localStorage.setItem('pomodoro_lastTick', Date.now().toString());
        // Start task timer when focus begins
        if (mode === 'focus' && currentTaskId && onStartTask) {
          onStartTask(currentTaskId);
        }
      } else {
        // Stop task timer when focus pauses
        if (mode === 'focus' && currentTaskId && onStopTask) {
          onStopTask(currentTaskId);
        }
      }
      broadcastState({ isRunning: next });
      return next;
    });
  };

  const logPartialSession = () => {
    if (mode === 'focus' && user && timeLeft > 0) {
      const fullDuration = getDuration('focus');
      const elapsedSeconds = fullDuration - timeLeft;
      
      if (elapsedSeconds >= 60) {
        supabase.from('pomodoro_sessions').insert({
          user_id: user.id,
          duration: elapsedSeconds,
          completed_at: new Date().toISOString()
        }).then(({ error }) => {
          if (error) console.error('Failed to log partial session:', error.message);
        });
      }
    }
  };

  const stopAndClose = () => {
    // Full stop: stop timer, stop task, log partial, reset, then close
    logPartialSession();
    if (isRunning && mode === 'focus' && currentTaskId && onStopTask) {
      onStopTask(currentTaskId);
    }
    setIsRunning(false);
    setTimeLeft(getDuration(mode));
    setIsFullscreen(false);
    broadcastState({ isRunning: false, timeLeft: getDuration(mode) });
    onClose();
  };

  const resetTimer = () => {
    logPartialSession();
    if (mode === 'focus' && isRunning && currentTaskId && onStopTask) {
      onStopTask(currentTaskId);
    }
    setIsRunning(false);
    setTimeLeft(getDuration(mode));
    broadcastState({ isRunning: false, timeLeft: getDuration(mode) });
  };

  const handleDurationChange = (key, value) => {
    const num = Math.max(1, Math.min(120, parseInt(value) || 1));
    setCustomDurations(prev => ({ ...prev, [key]: num }));
    if (key === mode && !isRunning) {
      setTimeLeft(num * 60);
    }
    // Sync to Supabase via context
    updatePomodoroSettings({ [key]: num });
  };

  const handleSelectTask = (selectedTask) => {
    // Don't allow task switch while running
    if (isRunning) return;
    
    if (selectedTask) {
      setCurrentTaskId(selectedTask.id);
      setCurrentTaskName(selectedTask.name);
      localStorage.setItem('pomodoro_taskId', selectedTask.id);
      localStorage.setItem('pomodoro_taskName', selectedTask.name);
    } else {
      setCurrentTaskId(null);
      setCurrentTaskName('');
      localStorage.removeItem('pomodoro_taskId');
      localStorage.removeItem('pomodoro_taskName');
    }
    setShowTaskPicker(false);
    broadcastState({ 
      currentTaskId: selectedTask ? selectedTask.id : null, 
      currentTaskName: selectedTask ? selectedTask.name : '' 
    });
  };

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  // Handle overlay click - only allow close when NOT running
  const handleOverlayClick = () => {
    if (!isRunning) {
      setIsFullscreen(false);
      onClose();
    }
    // If running, do nothing - user must stop first
  };

  const formatTimerTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = 1 - (timeLeft / getDuration(mode));
  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference * (1 - progress);

  // Filter available tasks for the picker (not completed)
  const availableTasks = (tasks || []).filter(t => !t.completed && t.status !== 'completed');

  if (!isOpen) return null;

  return (
    <div 
      className={`pomodoro-overlay ${isFullscreen ? 'pomodoro-fullscreen' : ''}`} 
      onClick={handleOverlayClick}
    >
      <div 
        className={`pomodoro-modal ${isFullscreen ? 'fullscreen-modal' : ''}`} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="pomodoro-header">
          <div className="pomodoro-header-left">
            {/* Settings - only when not running */}
            <button 
              className="pomodoro-header-btn" 
              onClick={() => !isRunning && setShowSettings(true)} 
              disabled={isRunning || showSettings}
              title={isRunning ? "Cannot change settings during focus" : "Settings"}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>

          <div className="pomodoro-header-center">
            <h2>🍅 Pomodoro Timer</h2>
          </div>

          <div className="pomodoro-header-actions">
            {/* Fullscreen Toggle */}
            <button 
              className="pomodoro-header-btn" 
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="4 14 10 14 10 20"/>
                  <polyline points="20 10 14 10 14 4"/>
                  <line x1="14" y1="10" x2="21" y2="3"/>
                  <line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 3 21 3 21 9"/>
                  <polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/>
                  <line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              )}
            </button>
            {/* Close/Stop - when running shows STOP, when idle shows X */}
            {isRunning ? (
              <button className="pomodoro-stop-btn" onClick={stopAndClose} title="Stop focus & close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="4" y="4" width="16" height="16" rx="2"/>
                </svg>
                <span>Stop</span>
              </button>
            ) : (
              <button className="pomodoro-close-btn" onClick={() => { setIsFullscreen(false); onClose(); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Main Content Area - Switches between Timer and Settings */}
        {showSettings ? (
          <div className="pomodoro-settings-view">
            <div className="pomodoro-settings-header">
              <button className="pomodoro-back-btn" onClick={() => setShowSettings(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                Back to Timer
              </button>
              <h4>Timer Durations (minutes)</h4>
            </div>

            <div className="pomodoro-settings-grid">
              <div className="pomodoro-setting-item">
                <label>
                  <span>Focus Period</span>
                  <input
                    type="number"
                    min="1" max="120"
                    value={customDurations.focus}
                    onChange={(e) => handleDurationChange('focus', e.target.value)}
                  />
                </label>
              </div>
              <div className="pomodoro-setting-item">
                <label>
                  <span>Short Break</span>
                  <input
                    type="number"
                    min="1" max="30"
                    value={customDurations.shortBreak}
                    onChange={(e) => handleDurationChange('shortBreak', e.target.value)}
                  />
                </label>
              </div>
              <div className="pomodoro-setting-item">
                <label>
                  <span>Long Break</span>
                  <input
                    type="number"
                    min="1" max="60"
                    value={customDurations.longBreak}
                    onChange={(e) => handleDurationChange('longBreak', e.target.value)}
                  />
                </label>
              </div>
            </div>
            
            <div className="pomodoro-settings-tips">
              <p>💡 Tip: Long breaks are triggered after every 4 focus sessions.</p>
            </div>

            <div className="pomodoro-setting-item">
              <div className="pomodoro-sound-toggle" onClick={() => {
                // Unlock audio context on toggle click
                try {
                  if (!audioContextRef.current) {
                    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
                  }
                  if (audioContextRef.current.state === 'suspended') {
                    audioContextRef.current.resume();
                  }
                } catch (e) { /* silent */ }
                const nextValue = !tickEnabled;
                setTickEnabled(nextValue);
                updatePomodoroSettings({ tickEnabled: nextValue });
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span>Focus Ticking Sound</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: '400', color: 'var(--text-secondary)' }}>
                    Plays a subtle tick every second
                  </span>
                </div>
                <label className="pomodoro-switch" onClick={(e) => e.stopPropagation()}>
                  <input 
                    type="checkbox" 
                    checked={tickEnabled} 
                    onChange={(e) => {
                      const nextValue = e.target.checked;
                      setTickEnabled(nextValue);
                      updatePomodoroSettings({ tickEnabled: nextValue });
                    }} 
                  />
                  <span className="pomodoro-slider"></span>
                </label>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Task Info Section */}
            <div className="pomodoro-task-info">
              {currentTaskName ? (
                <p className="pomodoro-task-name">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{verticalAlign: 'middle', marginRight: 4}}>
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  Focusing on: <strong>{currentTaskName}</strong>
                </p>
              ) : (
                !isRunning && <p className="pomodoro-task-name pomodoro-no-task">No task selected — free focus</p>
              )}
            </div>

            {/* Task Selector - only when not running */}
            {!isRunning && (
              <div className="pomodoro-task-selector">
                <button 
                  className="pomodoro-task-picker-btn"
                  onClick={() => setShowTaskPicker(!showTaskPicker)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 11l3 3L22 4"/>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                  {currentTaskName ? `Task: ${currentTaskName}` : 'Select a task (optional)'}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginLeft: 'auto'}}>
                    <polyline points={showTaskPicker ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}/>
                  </svg>
                </button>
                
                {showTaskPicker && (
                  <div className="pomodoro-task-dropdown">
                    <button 
                      className={`pomodoro-task-option ${!currentTaskId ? 'selected' : ''}`}
                      onClick={() => handleSelectTask(null)}
                    >
                      <span className="task-option-icon">🎯</span>
                      Free Focus (no task)
                    </button>
                    {availableTasks.length === 0 && (
                      <div className="pomodoro-task-empty">No active tasks available</div>
                    )}
                    {availableTasks.map(t => (
                      <button 
                        key={t.id}
                        className={`pomodoro-task-option ${currentTaskId === t.id ? 'selected' : ''}`}
                        onClick={() => handleSelectTask(t)}
                      >
                        <span className="task-option-icon">
                          {t.status === 'running' ? '▶️' : '📋'}
                        </span>
                        <span className="task-option-name">{t.name}</span>
                        {t.status === 'running' && <span className="task-option-badge">Active</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Focus Lock Banner - shown when timer is running */}
            {isRunning && mode === 'focus' && (
              <div className="pomodoro-focus-lock">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Focus locked — stop timer to exit
              </div>
            )}

            {/* Mode Tabs */}
            <div className="pomodoro-modes">
              {Object.entries(MODES).map(([key, { label }]) => (
                <button
                  key={key}
                  className={`pomodoro-mode-tab ${mode === key ? 'active' : ''}`}
                  onClick={() => { if (!isRunning) switchMode(key); }}
                  data-mode={key}
                  disabled={isRunning}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Timer Circle */}
            <div className="pomodoro-timer-container">
              <svg className="pomodoro-ring" viewBox="0 0 260 260">
                <circle
                  className="pomodoro-ring-bg"
                  cx="130" cy="130" r="120"
                  strokeWidth="6"
                />
                <circle
                  className="pomodoro-ring-progress"
                  cx="130" cy="130" r="120"
                  strokeWidth="6"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  style={{ stroke: MODES[mode].color }}
                />
              </svg>
              <div className="pomodoro-timer-display">
                <span className="pomodoro-time" style={{ color: MODES[mode].color }}>
                  {formatTimerTime(timeLeft)}
                </span>
                <span className="pomodoro-mode-label">{MODES[mode].label}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="pomodoro-controls">
              <button 
                className="pomodoro-btn secondary" 
                onClick={resetTimer} 
                title="Reset"
                disabled={isRunning}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 4v6h-6" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
              </button>
              <button className="pomodoro-btn primary" onClick={toggleTimer} style={{ backgroundColor: MODES[mode].color }}>
                {isRunning ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                )}
              </button>
              {/* Skip is disabled when running in focus mode */}
              <button 
                className="pomodoro-btn secondary" 
                onClick={() => { if (!isRunning) { if (mode === 'focus') { logPartialSession(); const c = sessionsCompleted + 1; setSessionsCompleted(c); switchMode(c % 4 === 0 ? 'longBreak' : 'shortBreak'); } else { switchMode('focus'); } } }}
                title={isRunning ? "Cannot skip during focus" : "Skip"}
                disabled={isRunning}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 4 15 12 5 20 5 4" />
                  <line x1="19" y1="5" x2="19" y2="19" />
                </svg>
              </button>
            </div>

            {/* Session Counter */}
            <div className="pomodoro-sessions">
              <span className="pomodoro-sessions-label">Sessions completed</span>
              <div className="pomodoro-session-dots">
                {[0, 1, 2, 3].map(i => (
                  <span
                    key={i}
                    className={`pomodoro-dot ${i < (sessionsCompleted % 4) ? 'filled' : ''}`}
                    style={i < (sessionsCompleted % 4) ? { backgroundColor: MODES.focus.color } : {}}
                  />
                ))}
              </div>
              <span className="pomodoro-sessions-count">{sessionsCompleted}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PomodoroTimer;
