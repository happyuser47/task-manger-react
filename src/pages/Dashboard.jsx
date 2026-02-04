import { useState } from 'react';
import { useTaskManager } from '../hooks/useTaskManager';
import { useTheme } from '../hooks/useTheme';
import Header from '../components/Header';
import Stats from '../components/Stats';
import AddTaskForm from '../components/AddTaskForm';
import TaskList from '../components/TaskList';
import Notification from '../components/Notification';
import Analytics from '../components/Analytics';
import SessionHistory from '../components/SessionHistory';
import UserMenu from '../components/UserMenuNew';
import Loader from '../components/Loader';
import ExportMenu from '../components/ExportMenu';
import WorkSession from '../components/WorkSession';
import { useWorkSessionContext } from '../contexts/WorkSessionContext';
import { useEffect } from 'react';
import './Dashboard.css';

const Dashboard = () => {
  const [activeView, setActiveView] = useState('tasks');

  const {
    tasks,
    stats,
    loading: tasksLoading,
    notifications,
    addTask,
    updateTask,
    deleteTask,
    startTask,
    stopTask,
    completeTask,
    restartTask,
    removeNotification,
  } = useTaskManager();

  const {
    allSessions,
    loading: sessionsLoading
  } = useWorkSessionContext();

  const { theme, toggleTheme } = useTheme();

  const loading = tasksLoading;

  if (loading) {
    return <Loader message="Loading your workspace..." />;
  }

  return (
    <div className="app">
      <Notification
        notifications={notifications}
        onClose={removeNotification}
      />

      <div className="app-container">
        <Header theme={theme} onToggleTheme={toggleTheme}>
          <ExportMenu tasks={tasks} sessions={allSessions} />
          <UserMenu />
        </Header>

        {/* Work Session - Check In/Out */}
        <div className="work-session-container">
          <WorkSession />
        </div>

        {/* Main Navigation Tabs */}
        <nav className="main-nav">
          <button
            className={`main-nav-tab ${activeView === 'tasks' ? 'active' : ''}`}
            onClick={() => setActiveView('tasks')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            Tasks
            {stats.inProgress > 0 && (
              <span className="nav-badge running">{stats.inProgress}</span>
            )}
          </button>
          <button
            className={`main-nav-tab ${activeView === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveView('analytics')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            Analytics
          </button>
          <button
            className={`main-nav-tab ${activeView === 'sessions' ? 'active' : ''}`}
            onClick={() => setActiveView('sessions')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Sessions
          </button>
        </nav>

        {/* Tasks View */}
        {activeView === 'tasks' && (
          <div className="view-content fade-in">
            <Stats stats={stats} />
            <AddTaskForm onAddTask={addTask} />
            <TaskList
              tasks={tasks}
              onStart={startTask}
              onStop={stopTask}
              onComplete={completeTask}
              onRestart={restartTask}
              onDelete={deleteTask}
              onUpdate={updateTask}
            />
          </div>
        )}

        {/* Analytics View */}
        {activeView === 'analytics' && (
          <div className="view-content fade-in">
            <Analytics tasks={tasks} />
          </div>
        )}

        {/* Sessions History View */}
        {activeView === 'sessions' && (
          <div className="view-content fade-in">
            <SessionHistory />
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
