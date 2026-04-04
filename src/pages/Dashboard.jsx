import { useState } from 'react';
import { useTaskManager } from '../hooks/useTaskManager';
import { useProjects } from '../hooks/useProjects';
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
import ProjectBoard from '../components/ProjectBoard';
import PomodoroTimer from '../components/PomodoroTimer';
import { useWorkSessionContext } from '../contexts/WorkSessionContext';
import { useEffect } from 'react';
import './Dashboard.css';

const Dashboard = () => {
  const [activeView, setActiveView] = useState('tasks');
  const [pomodoroOpen, setPomodoroOpen] = useState(false);
  const [pomodoroTask, setPomodoroTask] = useState(null);
  const [isFocusActive, setIsFocusActive] = useState(() => 
    localStorage.getItem('pomodoro_isRunning') === 'true'
  );

  const {
    tasks,
    stats,
    loading: tasksLoading,
    notifications,
    addTask,
    updateTask,
    deleteTask,
    deleteTasksByProject,
    startTask,
    stopTask,
    completeTask,
    restartTask,
    removeNotification,
  } = useTaskManager();

  const {
    projects,
    loading: projectsLoading,
    addProject,
    updateProject,
    deleteProject,
  } = useProjects();

  const {
    allSessions,
    loading: sessionsLoading
  } = useWorkSessionContext();

  const { theme, toggleTheme } = useTheme();
  
  // Track if we've ever finished loading once
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  useEffect(() => {
    if (!tasksLoading && !projectsLoading && !sessionsLoading) {
      setInitialLoadDone(true);
    }
  }, [tasksLoading, projectsLoading, sessionsLoading]);

  // Only show full page loader on FIRST load
  const loading = !initialLoadDone && (tasksLoading || projectsLoading || sessionsLoading);

  const handleOpenPomodoro = (task = null) => {
    setPomodoroTask(task);
    setPomodoroOpen(true);
  };

  const handleClosePomodoro = () => {
    setPomodoroOpen(false);
    setPomodoroTask(null);
  };

  const handleDeleteProject = async (id) => {
    const success = await deleteProject(id);
    if (success) {
      // Also remove tasks belonging to this project from local state
      deleteTasksByProject(id);
    }
  };

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
        <Header theme={theme} onToggleTheme={toggleTheme} disabled={isFocusActive}>
          <ExportMenu tasks={tasks} sessions={allSessions} disabled={isFocusActive} />
          <UserMenu disabled={isFocusActive} />
        </Header>

        {/* Work Session - Check In/Out */}
        <div className="work-session-container">
          <WorkSession />
        </div>

        {/* Main Navigation Tabs */}
        <nav className={`main-nav ${isFocusActive ? 'focus-mode-active' : ''}`}>
          <button
            className={`main-nav-tab ${activeView === 'tasks' ? 'active' : ''}`}
            onClick={() => !isFocusActive && setActiveView('tasks')}
            disabled={isFocusActive}
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
            className={`main-nav-tab ${activeView === 'projects' ? 'active' : ''}`}
            onClick={() => !isFocusActive && setActiveView('projects')}
            disabled={isFocusActive}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            Projects
            {projects.length > 0 && (
              <span className="nav-badge">{projects.length}</span>
            )}
          </button>
          <button
            className={`main-nav-tab ${activeView === 'analytics' ? 'active' : ''}`}
            onClick={() => !isFocusActive && setActiveView('analytics')}
            disabled={isFocusActive}
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
            onClick={() => !isFocusActive && setActiveView('sessions')}
            disabled={isFocusActive}
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

        {/* Navigation Content Views */}
        <div className="views-stack">
          {/* Tasks View */}
          <div className={`view-content ${activeView === 'tasks' ? 'active' : 'hidden'}`}>
            <Stats stats={stats} />
            <div className={`tasks-view-header ${isFocusActive ? 'disabled-section' : ''}`}>
              <AddTaskForm onAddTask={addTask} disabled={isFocusActive} />
            </div>
            <TaskList
              tasks={tasks}
              onStart={startTask}
              onStop={stopTask}
              onComplete={completeTask}
              onRestart={restartTask}
              onDelete={deleteTask}
              onUpdate={updateTask}
              onOpenPomodoro={handleOpenPomodoro}
              isFocusActive={isFocusActive}
            />
          </div>

          {/* Projects View */}
          <div className={`view-content ${activeView === 'projects' ? 'active' : 'hidden'}`}>
            <ProjectBoard
              projects={projects}
              tasks={tasks}
              onAddProject={addProject}
              onUpdateProject={updateProject}
              onDeleteProject={handleDeleteProject}
              onAddTask={addTask}
              onStartTask={startTask}
              onStopTask={stopTask}
              onCompleteTask={completeTask}
              onRestartTask={restartTask}
              onDeleteTask={deleteTask}
              onOpenPomodoro={handleOpenPomodoro}
              isFocusActive={isFocusActive}
            />
          </div>

          {/* Analytics View */}
          <div className={`view-content ${activeView === 'analytics' ? 'active' : 'hidden'}`}>
            <Analytics sessions={allSessions} />
          </div>

          {/* Sessions History View */}
          <div className={`view-content ${activeView === 'sessions' ? 'active' : 'hidden'}`}>
            <SessionHistory />
          </div>
        </div>
      </div>

      {/* Pomodoro FAB - always clickable so user can re-open running timer */}
        <button 
          className={`pomodoro-fab ${isFocusActive ? 'fab-active' : ''}`} 
          onClick={() => setPomodoroOpen(true)}
          title={isFocusActive ? "View running timer" : "Open Focus Mode"}
        >
          <div className="fab-icon-wrapper">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="13" r="8" />
              <path d="M12 9v4l2 2" />
              <path d="M5 3L2 6" />
              <path d="M22 6l-3-3" />
              <line x1="12" y1="5" x2="12" y2="3" />
            </svg>
          </div>
          <span className="fab-text">{isFocusActive ? 'Focusing...' : 'Focus Mode'}</span>
          {isFocusActive && <span className="fab-pulse-dot" />}
        </button>

      <PomodoroTimer
        isOpen={pomodoroOpen}
        onClose={handleClosePomodoro}
        task={pomodoroTask}
        tasks={tasks}
        onRunningChange={setIsFocusActive}
        onStartTask={startTask}
        onStopTask={stopTask}
      />
    </div>
  );
};

export default Dashboard;
