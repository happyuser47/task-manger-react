import React, { useState } from 'react';

const AddTaskForm = ({ onAddTask }) => {
  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (taskName.trim()) {
      onAddTask(taskName, description);
      setTaskName('');
      setDescription('');
    }
  };

  return (
    <form className="add-task-form" onSubmit={handleSubmit}>
      <div className="form-header">
        <div className="form-header-icon">✦</div>
        <div>
          <h2>Create New Task</h2>
          <p>Add a task and track your time</p>
        </div>
      </div>
      <div className="form-content">
        <div className="form-row">
          <div className="input-wrapper">
            <input
              type="text"
              className="form-input"
              placeholder="What are you working on?"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>
        <div className="form-row description-row">
          <div className="input-wrapper">
            <textarea
              className="form-textarea"
              placeholder="Task description (Optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <div className="form-footer">
          <button type="submit" className="btn btn-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Task
          </button>
        </div>
      </div>
    </form>
  );
};

export default AddTaskForm;
