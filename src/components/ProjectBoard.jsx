import React, { useState, useMemo } from 'react';
import { formatTime } from '../hooks/useTaskManager';
import './ProjectBoard.css';

// Icons
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const FolderIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const PauseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const PomodoroIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2 2" />
    <path d="M5 3L2 6" />
    <path d="M22 6l-3-3" />
    <line x1="12" y1="5" x2="12" y2="3" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M23 4v6h-6" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const ChevronDown = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const MoreIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
  </svg>
);

const ProjectBoard = ({
  projects,
  tasks,
  onAddProject,
  onDeleteProject,
  onAddTask,
  onStartTask,
  onStopTask,
  onCompleteTask,
  onRestartTask,
  onDeleteTask,
  onOpenPomodoro,
  isFocusActive,
}) => {
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [expandedProjects, setExpandedProjects] = useState({});
  const [addingTaskTo, setAddingTaskTo] = useState(null);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(null);
  const [confirmDeleteTask, setConfirmDeleteTask] = useState(null);

  const PROJECT_COLORS = [
    '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899',
    '#14b8a6', '#f97316', '#6366f1', '#06b6d4', '#84cc16',
  ];

  // Group tasks by project
  const tasksByProject = useMemo(() => {
    const map = {};
    projects.forEach(p => { map[p.id] = []; });
    tasks.forEach(t => {
      if (t.projectId && map[t.projectId]) {
        map[t.projectId].push(t);
      }
    });
    return map;
  }, [projects, tasks]);

  // Unassigned tasks
  const unassignedTasks = useMemo(() => {
    return tasks.filter(t => !t.projectId);
  }, [tasks]);

  const toggleProject = (id) => {
    setExpandedProjects(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddProject = async (e) => {
    e.preventDefault();
    if (isFocusActive || !newProjectName.trim()) return;
    const color = PROJECT_COLORS[projects.length % PROJECT_COLORS.length];
    await onAddProject(newProjectName, newProjectDesc, color);
    setNewProjectName('');
    setNewProjectDesc('');
    setIsAddingProject(false);
  };

  const handleAddTask = async (e, projectId) => {
    e.preventDefault();
    if (isFocusActive || !newTaskName.trim()) return;
    await onAddTask(newTaskName, newTaskDesc, projectId);
    setNewTaskName('');
    setNewTaskDesc('');
    setAddingTaskTo(null);
  };

  const handleDeleteProject = async (projectId) => {
    await onDeleteProject(projectId);
    setConfirmDeleteProject(null);
  };

  const handleDeleteTask = async (taskId) => {
    if (isFocusActive) return;
    await onDeleteTask(taskId);
    setConfirmDeleteTask(null);
  };

  const getProjectStats = (projectId) => {
    const projectTasks = tasksByProject[projectId] || [];
    const total = projectTasks.length;
    const completed = projectTasks.filter(t => t.completed).length;
    const running = projectTasks.filter(t => t.status === 'running').length;
    return { total, completed, running };
  };

  const renderTaskItem = (task) => {
    const isRunning = task.status === 'running';
    const isCompleted = task.status === 'completed' || task.completed;

    return (
      <div key={task.id} className={`pb-task-item ${isRunning ? 'running' : ''} ${isCompleted ? 'completed' : ''}`}>
        <div className="pb-task-main">
          <div className="pb-task-info">
            <div className="pb-task-checkbox">
              {isCompleted ? (
                <span className="pb-check-done">✓</span>
              ) : (
                <span className="pb-check-empty" />
              )}
            </div>
            <div className="pb-task-text">
              <span className={`pb-task-name ${isCompleted ? 'done' : ''}`}>{task.name}</span>
              {task.description && <span className="pb-task-desc">{task.description}</span>}
            </div>
          </div>

          <div className="pb-task-meta">
            {isRunning && (
              <span className="pb-task-timer running">
                <span className="pb-live-dot" />
                {formatTime(task.currentTime)}
              </span>
            )}
            {!isRunning && task.currentTime > 0 && (
              <span className="pb-task-timer">{formatTime(task.currentTime)}</span>
            )}
          </div>
        </div>

        <div className="pb-task-actions">
          {!isCompleted && !isRunning && (
            <>
              <button 
                className={`pb-action-btn start ${isFocusActive ? 'disabled' : ''}`} 
                onClick={() => !isFocusActive && onStartTask(task.id)} 
                disabled={isFocusActive}
                title={isFocusActive ? "Focus session active" : "Start Focus"}
              >
                <PlayIcon />
              </button>
              <button 
                className={`pb-action-btn pomodoro ${isFocusActive ? 'disabled' : ''}`} 
                onClick={() => !isFocusActive && onOpenPomodoro(task)} 
                disabled={isFocusActive}
                title={isFocusActive ? "Focus session active" : "Pomodoro"}
              >
                <PomodoroIcon />
              </button>
            </>
          )}
          {isRunning && (
            <>
              <button className="pb-action-btn pause" onClick={() => onStopTask(task.id)} title="Pause">
                <PauseIcon />
              </button>
              <button className="pb-action-btn complete" onClick={() => onCompleteTask(task.id)} title="Complete">
                <CheckIcon />
              </button>
            </>
          )}
          {isCompleted && (
            <button 
              className={`pb-action-btn restart ${isFocusActive ? 'disabled' : ''}`} 
              onClick={() => !isFocusActive && onRestartTask(task.id)} 
              disabled={isFocusActive}
              title={isFocusActive ? "Focus session active" : "Restart"}
            >
              <RefreshIcon />
            </button>
          )}
          {confirmDeleteTask === task.id ? (
            <div className="pb-confirm-inline">
              <button className="pb-action-btn danger" onClick={() => !isFocusActive && handleDeleteTask(task.id)}>Yes</button>
              <button className="pb-action-btn" onClick={() => setConfirmDeleteTask(null)}>No</button>
            </div>
          ) : (
            <button 
              className={`pb-action-btn delete ${isFocusActive ? 'disabled' : ''}`} 
              onClick={() => !isFocusActive && setConfirmDeleteTask(task.id)} 
              disabled={isFocusActive}
              title={isFocusActive ? "Cannot delete during focus" : "Delete"}
            >
              <TrashIcon />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="project-board">
      {/* Header */}
      <div className="pb-header">
        <div className="pb-header-info">
          <div className="pb-header-icon">
            <FolderIcon />
          </div>
          <div>
            <h2>Projects</h2>
            <p>Organize your tasks into focused projects</p>
          </div>
        </div>
        <button
          className={`pb-add-project-btn ${isFocusActive ? 'disabled' : ''}`}
          onClick={() => !isFocusActive && setIsAddingProject(true)}
          disabled={isFocusActive}
          title={isFocusActive ? "Cannot add projects during focus" : "New Project"}
        >
          <PlusIcon />
          New Project
        </button>
      </div>

      {/* Add Project Form */}
      {isAddingProject && (
        <form className="pb-add-form" onSubmit={handleAddProject}>
          <input
            type="text"
            className="pb-input"
            placeholder="Project name"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            autoFocus
          />
          <input
            type="text"
            className="pb-input small"
            placeholder="Description (optional)"
            value={newProjectDesc}
            onChange={(e) => setNewProjectDesc(e.target.value)}
          />
          <div className="pb-form-actions">
            <button type="submit" className="pb-btn primary">Create Project</button>
            <button type="button" className="pb-btn secondary" onClick={() => { setIsAddingProject(false); setNewProjectName(''); setNewProjectDesc(''); }}>Cancel</button>
          </div>
        </form>
      )}

      {/* Project Cards */}
      {projects.length === 0 && !isAddingProject && (
        <div className="pb-empty">
          <div className="pb-empty-icon">📁</div>
          <h3>No Projects Yet</h3>
          <p>Create your first project to organize tasks and boost productivity.</p>
          <button className="pb-btn primary" onClick={() => setIsAddingProject(true)}>
            <PlusIcon /> Create First Project
          </button>
        </div>
      )}

      <div className="pb-projects-list">
        {projects.map((project) => {
          const isExpanded = expandedProjects[project.id] !== false; // default expanded
          const projectTasks = tasksByProject[project.id] || [];
          const stats = getProjectStats(project.id);
          const progressPercent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

          return (
            <div key={project.id} className={`pb-project-card ${isExpanded ? 'expanded' : ''}`}>
              {/* Project Header */}
              <div className="pb-project-header" onClick={() => toggleProject(project.id)}>
                <div className="pb-project-color" style={{ backgroundColor: project.color || '#8b5cf6' }} />
                <div className="pb-project-info">
                  <h3 className="pb-project-name">{project.name}</h3>
                  {project.description && <p className="pb-project-desc">{project.description}</p>}
                </div>
                <div className="pb-project-stats">
                  <span className="pb-stat-pill">
                    {stats.completed}/{stats.total} tasks
                  </span>
                  {stats.running > 0 && (
                    <span className="pb-stat-pill running">
                      <span className="pb-live-dot" />
                      {stats.running} active
                    </span>
                  )}
                </div>
                <div className="pb-project-actions-header">
                  {confirmDeleteProject === project.id ? (
                    <div className="pb-confirm-inline" onClick={e => e.stopPropagation()}>
                      <span className="pb-confirm-text">Delete?</span>
                      <button className="pb-action-btn danger" onClick={() => !isFocusActive && handleDeleteProject(project.id)}>Yes</button>
                      <button className="pb-action-btn" onClick={() => setConfirmDeleteProject(null)}>No</button>
                    </div>
                  ) : (
                    <button
                      className={`pb-action-btn delete ${isFocusActive ? 'disabled' : ''}`}
                      onClick={(e) => { e.stopPropagation(); !isFocusActive && setConfirmDeleteProject(project.id); }}
                      disabled={isFocusActive}
                      title={isFocusActive ? "Cannot delete during focus" : "Delete project"}
                    >
                      <TrashIcon />
                    </button>
                  )}
                  <span className={`pb-chevron ${isExpanded ? 'open' : ''}`}>
                    <ChevronDown />
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              {stats.total > 0 && (
                <div className="pb-progress-bar">
                  <div
                    className="pb-progress-fill"
                    style={{
                      width: `${progressPercent}%`,
                      backgroundColor: project.color || '#8b5cf6',
                    }}
                  />
                </div>
              )}

              {/* Expanded Content */}
              {isExpanded && (
                <div className="pb-project-body">
                  {/* Tasks */}
                  {projectTasks.length > 0 ? (
                    <div className="pb-tasks-list">
                      {projectTasks.map(renderTaskItem)}
                    </div>
                  ) : (
                    <div className="pb-no-tasks">
                      <p>No tasks yet. Add one to get started!</p>
                    </div>
                  )}

                  {/* Add Task */}
                  {addingTaskTo === project.id ? (
                    <form className="pb-add-task-form" onSubmit={(e) => handleAddTask(e, project.id)}>
                      <input
                        type="text"
                        className="pb-input"
                        placeholder="Task name"
                        value={newTaskName}
                        onChange={(e) => setNewTaskName(e.target.value)}
                        autoFocus
                        disabled={isFocusActive}
                      />
                      <input
                        type="text"
                        className="pb-input small"
                        placeholder="Description (optional)"
                        value={newTaskDesc}
                        onChange={(e) => setNewTaskDesc(e.target.value)}
                        disabled={isFocusActive}
                      />
                      <div className="pb-form-actions">
                        <button type="submit" className="pb-btn primary small" disabled={isFocusActive}>Add Task</button>
                        <button type="button" className="pb-btn secondary small" onClick={() => { setAddingTaskTo(null); setNewTaskName(''); setNewTaskDesc(''); }}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <button
                      className={`pb-add-task-btn ${isFocusActive ? 'disabled' : ''}`}
                      onClick={() => !isFocusActive && setAddingTaskTo(project.id)}
                      disabled={isFocusActive}
                      title={isFocusActive ? "Cannot add tasks during focus" : "Add Task"}
                    >
                      <PlusIcon /> Add Task
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Unassigned Tasks */}
      {unassignedTasks.length > 0 && (
        <div className="pb-unassigned-section">
          <div className="pb-unassigned-header">
            <h3>📋 Standalone Tasks</h3>
            <span className="pb-stat-pill">{unassignedTasks.length} tasks</span>
          </div>
          <div className="pb-tasks-list">
            {unassignedTasks.map(renderTaskItem)}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectBoard;
