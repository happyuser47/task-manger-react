import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

// Generate unique ID for notifications
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const useTaskManager = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const notifiedExceedingRef = useRef(new Set());
  const timerDataRef = useRef({}); // Store timer data locally

  // Fetch tasks from Supabase
  useEffect(() => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const fetchTasks = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tasks:', error);
        addNotification('warning', 'Error', 'Failed to load tasks');
      } else {
        // Map Supabase data to our task format with persisted timer state
        const mappedTasks = data.map(task => {
          // Check if task was running (has started_at)
          const startedAt = task.started_at ? new Date(task.started_at).getTime() : null;
          const isRunning = startedAt && !task.completed;
          
          // Calculate current elapsed time if running
          let currentTime = task.elapsed_time || 0;
          if (isRunning) {
            const elapsedSinceStart = Math.floor((Date.now() - startedAt) / 1000);
            currentTime = (task.elapsed_time || 0) + elapsedSinceStart;
          }
          
          return {
            id: task.id,
            name: task.title,
            status: task.completed ? 'completed' : (isRunning ? 'running' : 'idle'),
            currentTime: currentTime,
            bestTime: task.best_time || null,
            attempts: task.attempts || [],
            isExceeding: false,
            startedAt: startedAt,
            createdAt: new Date(task.created_at).getTime(),
            completed: task.completed,
          };
        });
        setTasks(mappedTasks);
      }
      setLoading(false);
    };

    fetchTasks();

    // Subscribe to realtime changes
    const subscription = supabase
      .channel('tasks_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newTask = {
              id: payload.new.id,
              name: payload.new.title,
              status: payload.new.completed ? 'completed' : 'idle',
              currentTime: payload.new.elapsed_time || 0,
              bestTime: payload.new.best_time || null,
              attempts: payload.new.attempts || [],
              isExceeding: false,
              startedAt: null,
              createdAt: new Date(payload.new.created_at).getTime(),
              completed: payload.new.completed,
            };
            setTasks(prev => [newTask, ...prev]);
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(t => t.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            setTasks(prev => prev.map(t => {
              if (t.id === payload.new.id) {
                return {
                  ...t,
                  name: payload.new.title,
                  completed: payload.new.completed,                  currentTime: payload.new.elapsed_time ?? t.currentTime,
                  bestTime: payload.new.best_time ?? t.bestTime,
                  attempts: payload.new.attempts ?? t.attempts,                  status: payload.new.completed ? 'completed' : t.status,
                };
              }
              return t;
            }));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  // Add notification - with deduplication
  const addNotification = useCallback((type, title, message, dedupKey = null) => {
    const id = generateId();
    setNotifications(prev => {
      // Prevent duplicate notifications
      if (dedupKey && prev.some(n => n.dedupKey === dedupKey)) {
        return prev;
      }
      return [...prev, { id, type, title, message, dedupKey }];
    });
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  }, []);

  // Remove notification
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Add a new task
  const addTask = useCallback(async (name) => {
    if (!name.trim() || !user) return;
    
    const { data, error } = await supabase
      .from('tasks')
      .insert([
        { 
          user_id: user.id, 
          title: name.trim(), 
          completed: false 
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error adding task:', error);
      addNotification('warning', 'Error', 'Failed to add task');
    } else if (data) {
      // Add to local state immediately
      const newTask = {
        id: data.id,
        name: data.title,
        status: 'idle',
        currentTime: 0,
        bestTime: null,
        attempts: [],
        isExceeding: false,
        startedAt: null,
        createdAt: new Date(data.created_at).getTime(),
        completed: data.completed,
      };
      setTasks(prev => [newTask, ...prev]);
      addNotification('success', 'Task Added', `"${name}" has been added to your tasks.`);
    }
  }, [user, addNotification]);

  // Delete a task
  const deleteTask = useCallback(async (id) => {
    if (!user) return;
    
    const task = tasks.find(t => t.id === id);
    const taskName = task?.name || 'Task';
    
    // Immediately remove from local state for better UX
    setTasks(prev => prev.filter(t => t.id !== id));
    
    const { data, error, count } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .select();

    console.log('Delete result:', { data, error, count, taskId: id, userId: user.id });

    if (error) {
      console.error('Error deleting task:', error);
      // Revert local state if delete failed
      if (task) {
        setTasks(prev => [task, ...prev]);
      }
      addNotification('warning', 'Error', `Failed to delete task: ${error.message}`);
    } else if (!data || data.length === 0) {
      console.error('No rows deleted - task may not exist or RLS policy blocked');
      // Revert local state if nothing was deleted
      if (task) {
        setTasks(prev => [task, ...prev]);
      }
      addNotification('warning', 'Error', 'Task could not be deleted. Check permissions.');
    } else {
      // Clean up local timer data
      delete timerDataRef.current[id];
      notifiedExceedingRef.current.delete(id);
      addNotification('info', 'Task Deleted', `"${taskName}" has been removed.`);
    }
  }, [user, tasks, addNotification]);

  // Update a task's name
  const updateTask = useCallback(async (id, newName) => {
    if (!user || !newName.trim()) return;
    
    const trimmedName = newName.trim();
    const task = tasks.find(t => t.id === id);
    const oldName = task?.name || '';
    
    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.id === id ? { ...t, name: trimmedName } : t
    ));
    
    const { error } = await supabase
      .from('tasks')
      .update({ title: trimmedName })
      .eq('id', id);

    if (error) {
      console.error('Error updating task:', error);
      // Revert on error
      setTasks(prev => prev.map(t => 
        t.id === id ? { ...t, name: oldName } : t
      ));
      addNotification('warning', 'Error', 'Failed to update task');
    } else {
      addNotification('success', 'Task Updated', `Task renamed to "${trimmedName}"`);
    }
  }, [user, tasks, addNotification]);

  // Stop timer for a task and save to Supabase
  const stopTask = useCallback(async (id) => {
    notifiedExceedingRef.current.delete(id);
    
    const task = tasks.find(t => t.id === id);
    if (!task || task.status !== 'running') return;
    
    const currentTime = task.currentTime;
    
    // Update local state immediately
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        return {
          ...t,
          status: 'idle',
          startedAt: null,
        };
      }
      return t;
    }));
    
    // Save elapsed time and clear started_at in Supabase
    const { error } = await supabase
      .from('tasks')
      .update({ 
        elapsed_time: currentTime,
        started_at: null 
      })
      .eq('id', id);
    
    if (error) {
      console.error('Error saving timer state:', error);
    }
  }, [tasks]);

  // Start timer for a task and save to Supabase
  const startTask = useCallback(async (id) => {
    const now = Date.now();
    const nowISO = new Date(now).toISOString();
    
    // First, stop any other running tasks locally and in Supabase
    const runningTask = tasks.find(t => t.status === 'running' && t.id !== id);
    if (runningTask) {
      // Stop the running task inline to avoid circular dependency
      const currentTime = runningTask.currentTime;
      setTasks(prev => prev.map(t => {
        if (t.id === runningTask.id) {
          return { ...t, status: 'idle', startedAt: null };
        }
        return t;
      }));
      await supabase
        .from('tasks')
        .update({ elapsed_time: currentTime, started_at: null })
        .eq('id', runningTask.id);
    }
    
    // Update local state immediately
    setTasks(prev => prev.map(task => {
      if (task.id === id) {
        return {
          ...task,
          status: 'running',
          isExceeding: false,
          startedAt: now,
        };
      }
      return task;
    }));
    
    // Save to Supabase
    const { error } = await supabase
      .from('tasks')
      .update({ started_at: nowISO })
      .eq('id', id);
    
    if (error) {
      console.error('Error starting task:', error);
    }
  }, [tasks]);

  // Complete a task
  const completeTask = useCallback(async (id) => {
    if (!user) return;
    
    notifiedExceedingRef.current.delete(id);
    const task = tasks.find(t => t.id === id);
    
    if (!task) return;
    
    const finalTime = task.currentTime;
    const newAttempts = [...task.attempts, finalTime];
    const newBestTime = task.bestTime === null 
      ? finalTime 
      : Math.min(task.bestTime, finalTime);

    // Update in Supabase with timer data
    const { error } = await supabase
      .from('tasks')
      .update({ 
        completed: true,
        elapsed_time: 0,
        started_at: null,
        best_time: newBestTime,
        attempts: newAttempts
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error completing task:', error);
      addNotification('warning', 'Error', 'Failed to complete task');
    } else {
      // Update local state
      setTasks(prev => prev.map(t => {
        if (t.id === id) {
          const updatedTask = {
            ...t,
            status: 'completed',
            attempts: newAttempts,
            bestTime: newBestTime,
            currentTime: 0,
            startedAt: null,
            isExceeding: false,
            completed: true,
          };
          timerDataRef.current[id] = { ...updatedTask };
          return updatedTask;
        }
        return t;
      }));
      
      addNotification(
        'success', 
        'Task Completed!', 
        `"${task.name}" completed in ${formatTime(finalTime)}`,
        `complete-${id}-${Date.now()}`
      );
    }
  }, [user, tasks, addNotification]);

  // Restart a completed task
  const restartTask = useCallback(async (id) => {
    if (!user) return;
    
    const now = Date.now();
    const nowISO = new Date(now).toISOString();
    
    // First, stop any other running tasks inline to avoid circular dependency
    const runningTask = tasks.find(t => t.status === 'running' && t.id !== id);
    if (runningTask) {
      const currentTime = runningTask.currentTime;
      setTasks(prev => prev.map(t => {
        if (t.id === runningTask.id) {
          return { ...t, status: 'idle', startedAt: null };
        }
        return t;
      }));
      await supabase
        .from('tasks')
        .update({ elapsed_time: currentTime, started_at: null })
        .eq('id', runningTask.id);
    }
    
    // Update in Supabase to mark as not completed, reset elapsed_time, and set started_at
    const { error } = await supabase
      .from('tasks')
      .update({ 
        completed: false, 
        elapsed_time: 0,
        started_at: nowISO
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error restarting task:', error);
      addNotification('warning', 'Error', 'Failed to restart task');
    } else {
      setTasks(prev => prev.map(task => {
        if (task.id === id) {
          return {
            ...task,
            status: 'running',
            currentTime: 0,
            isExceeding: false,
            startedAt: now,
            completed: false,
          };
        }
        return task;
      }));
    }
  }, [user, tasks, addNotification]);

  // Update timer for running tasks
  const updateTimers = useCallback(() => {
    setTasks(prev => {
      let shouldNotify = null;
      
      const updatedTasks = prev.map(task => {
        if (task.status === 'running' && task.startedAt) {
          const newCurrentTime = task.currentTime + 1;
          
          // Check if exceeding best time
          const isExceeding = task.bestTime !== null && newCurrentTime > task.bestTime;
          
          // Check if we should show notification (first time exceeding)
          if (isExceeding && !task.isExceeding && !notifiedExceedingRef.current.has(task.id)) {
            shouldNotify = task;
            notifiedExceedingRef.current.add(task.id);
          }
          
          const updatedTask = {
            ...task,
            currentTime: newCurrentTime,
            isExceeding,
          };
          timerDataRef.current[task.id] = { ...timerDataRef.current[task.id], ...updatedTask };
          return updatedTask;
        }
        return task;
      });
      
      // Show notification outside of state update
      if (shouldNotify) {
        setTimeout(() => {
          addNotification(
            'warning',
            'Time Alert',
            `You're exceeding your best time on "${shouldNotify.name}". Keep pushing!`,
            `exceeding-${shouldNotify.id}`
          );
        }, 0);
      }
      
      return updatedTasks;
    });
  }, [addNotification]);

  // Timer effect
  useEffect(() => {
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [updateTimers]);

  // Get statistics
  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed' || t.completed).length,
    inProgress: tasks.filter(t => t.status === 'running').length,
    totalTime: tasks.reduce((acc, t) => acc + (t.attempts?.reduce((a, b) => a + b, 0) || 0), 0),
  };

  return {
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
  };
};

// Format time helper
export const formatTime = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};
