import React, { useState } from 'react';
import TaskCard from './TaskCard';

const TaskList = ({ 
  tasks, 
  onStart, 
  onStop, 
  onComplete, 
  onRestart, 
  onDelete,
  onUpdate 
}) => {
  const [filter, setFilter] = useState('all');

  const filteredTasks = tasks.filter(task => {
    switch (filter) {
      case 'active':
        return task.status !== 'completed';
      case 'running':
        return task.status === 'running';
      case 'completed':
        return task.status === 'completed';
      default:
        return true;
    }
  });

  return (
    <div className="task-list-section">
      <div className="task-list-header">
        <div className="task-list-title">
          <h2>Your Tasks</h2>
          <span className="task-count">{filteredTasks.length}</span>
        </div>
        
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={`filter-tab ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
          >
            Active
          </button>
          <button 
            className={`filter-tab ${filter === 'running' ? 'active' : ''}`}
            onClick={() => setFilter('running')}
          >
            Running
          </button>
          <button 
            className={`filter-tab ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed
          </button>
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h3>No tasks found</h3>
          <p>
            {filter === 'all' 
              ? 'Create your first task to get started!' 
              : `No ${filter} tasks at the moment.`}
          </p>
        </div>
      ) : (
        <div className="task-list">
          {filteredTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onStart={onStart}
              onStop={onStop}
              onComplete={onComplete}
              onRestart={onRestart}
              onDelete={onDelete}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskList;
