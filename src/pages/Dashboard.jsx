import { useState } from 'react';
import { useTaskManager } from '../hooks/useTaskManager';
import { useTheme } from '../hooks/useTheme';
import Header from '../components/Header';
import Stats from '../components/Stats';
import AddTaskForm from '../components/AddTaskForm';
import TaskList from '../components/TaskList';
import Notification from '../components/Notification';
import Analytics from '../components/Analytics';
import UserMenu from '../components/UserMenuNew';
import Loader from '../components/Loader';
import ExportMenu from '../components/ExportMenu';
import './Dashboard.css';

const Dashboard = () => {
  const [activeView, setActiveView] = useState('tasks');
  
  const {
    tasks,
    stats,
    loading,
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

  const { theme, toggleTheme } = useTheme();

  if (loading) {
    return <Loader message="Loading your tasks..." />;
  }

  return (
    <div className="app">
      <Notification 
        notifications={notifications} 
        onClose={removeNotification} 
      />
      
      <div className="app-container">
        <Header theme={theme} onToggleTheme={toggleTheme}>
          <ExportMenu tasks={tasks} />
          <UserMenu />
        </Header>
        
        {/* Main Navigation Tabs */}
        <nav className="main-nav">
          <button 
            className={`main-nav-tab ${activeView === 'tasks' ? 'active' : ''}`}
            onClick={() => setActiveView('tasks')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
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
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
            Analytics
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
      </div>
    </div>
  );
};

export default Dashboard;
