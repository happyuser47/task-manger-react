import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db } from '../config/firebase';
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
  const timersRef = useRef({});

  // Listen to user's tasks from Firestore
  useEffect(() => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    const tasksQuery = query(
      collection(db, 'tasks'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(tasksQuery, 
      (snapshot) => {
        const tasksData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Convert Firestore timestamp to JS
          createdAt: doc.data().createdAt?.toMillis() || Date.now(),
        }));
        setTasks(tasksData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching tasks:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Timer effect for running tasks
  useEffect(() => {
    const interval = setInterval(() => {
      setTasks(prevTasks => {
        let shouldNotify = null;
        
        const updatedTasks = prevTasks.map(task => {
          if (task.status === 'running' && task.startedAt) {
            const elapsed = Math.floor((Date.now() - task.startedAt) / 1000);
            const newCurrentTime = (task.baseTime || 0) + elapsed;
            
            // Check if exceeding best time
            const isExceeding = task.bestTime !== null && newCurrentTime > task.bestTime;
            
            // Check if we should show notification
            if (isExceeding && !task.isExceeding && !notifiedExceedingRef.current.has(task.id)) {
              shouldNotify = task;
              notifiedExceedingRef.current.add(task.id);
            }
            
            return {
              ...task,
              currentTime: newCurrentTime,
              isExceeding,
            };
          }
          return task;
        });
        
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
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Add notification
  const addNotification = useCallback((type, title, message, dedupKey = null) => {
    const id = generateId();
    setNotifications(prev => {
      if (dedupKey && prev.some(n => n.dedupKey === dedupKey)) {
        return prev;
      }
      return [...prev, { id, type, title, message, dedupKey }];
    });
    
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
    
    try {
      await addDoc(collection(db, 'tasks'), {
        userId: user.uid,
        name: name.trim(),
        status: 'idle',
        currentTime: 0,
        baseTime: 0,
        bestTime: null,
        attempts: [],
        isExceeding: false,
        startedAt: null,
        createdAt: serverTimestamp(),
      });
      
      addNotification('success', 'Task Added', `"${name}" has been added to your tasks.`);
    } catch (error) {
      console.error('Error adding task:', error);
      addNotification('warning', 'Error', 'Failed to add task. Please try again.');
    }
  }, [user, addNotification]);

  // Delete a task
  const deleteTask = useCallback(async (id) => {
    if (!user) return;
    
    try {
      const task = tasks.find(t => t.id === id);
      await deleteDoc(doc(db, 'tasks', id));
      
      if (task) {
        addNotification('info', 'Task Deleted', `"${task.name}" has been removed.`);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      addNotification('warning', 'Error', 'Failed to delete task. Please try again.');
    }
  }, [user, tasks, addNotification]);

  // Start timer for a task
  const startTask = useCallback(async (id) => {
    if (!user) return;
    
    try {
      const task = tasks.find(t => t.id === id);
      
      // Stop any other running tasks
      const runningTasks = tasks.filter(t => t.status === 'running' && t.id !== id);
      for (const runningTask of runningTasks) {
        const elapsed = Math.floor((Date.now() - runningTask.startedAt) / 1000);
        await updateDoc(doc(db, 'tasks', runningTask.id), {
          status: 'idle',
          startedAt: null,
          baseTime: (runningTask.baseTime || 0) + elapsed,
        });
      }
      
      // Start the selected task
      await updateDoc(doc(db, 'tasks', id), {
        status: 'running',
        isExceeding: false,
        startedAt: Date.now(),
        baseTime: task?.currentTime || 0,
      });
    } catch (error) {
      console.error('Error starting task:', error);
    }
  }, [user, tasks]);

  // Stop timer for a task
  const stopTask = useCallback(async (id) => {
    if (!user) return;
    
    try {
      notifiedExceedingRef.current.delete(id);
      const task = tasks.find(t => t.id === id);
      
      if (task && task.status === 'running') {
        const elapsed = Math.floor((Date.now() - task.startedAt) / 1000);
        await updateDoc(doc(db, 'tasks', id), {
          status: 'idle',
          startedAt: null,
          baseTime: (task.baseTime || 0) + elapsed,
        });
      }
    } catch (error) {
      console.error('Error stopping task:', error);
    }
  }, [user, tasks]);

  // Complete a task
  const completeTask = useCallback(async (id) => {
    if (!user) return;
    
    try {
      notifiedExceedingRef.current.delete(id);
      const task = tasks.find(t => t.id === id);
      
      if (task) {
        const elapsed = task.status === 'running' && task.startedAt 
          ? Math.floor((Date.now() - task.startedAt) / 1000) 
          : 0;
        const finalTime = (task.baseTime || 0) + elapsed;
        const newAttempts = [...(task.attempts || []), finalTime];
        const newBestTime = task.bestTime === null 
          ? finalTime 
          : Math.min(task.bestTime, finalTime);
        
        await updateDoc(doc(db, 'tasks', id), {
          status: 'completed',
          attempts: newAttempts,
          bestTime: newBestTime,
          currentTime: 0,
          baseTime: 0,
          startedAt: null,
          isExceeding: false,
        });
        
        addNotification(
          'success', 
          'Task Completed!', 
          `"${task.name}" completed in ${formatTime(finalTime)}`,
          `complete-${id}-${Date.now()}`
        );
      }
    } catch (error) {
      console.error('Error completing task:', error);
    }
  }, [user, tasks, addNotification]);

  // Restart a completed task
  const restartTask = useCallback(async (id) => {
    if (!user) return;
    
    try {
      // Stop any other running tasks
      const runningTasks = tasks.filter(t => t.status === 'running' && t.id !== id);
      for (const runningTask of runningTasks) {
        const elapsed = Math.floor((Date.now() - runningTask.startedAt) / 1000);
        await updateDoc(doc(db, 'tasks', runningTask.id), {
          status: 'idle',
          startedAt: null,
          baseTime: (runningTask.baseTime || 0) + elapsed,
        });
      }
      
      // Restart the selected task
      await updateDoc(doc(db, 'tasks', id), {
        status: 'running',
        currentTime: 0,
        baseTime: 0,
        isExceeding: false,
        startedAt: Date.now(),
      });
    } catch (error) {
      console.error('Error restarting task:', error);
    }
  }, [user, tasks]);

  // Get statistics
  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    inProgress: tasks.filter(t => t.status === 'running').length,
    totalTime: tasks.reduce((acc, t) => acc + (t.attempts || []).reduce((a, b) => a + b, 0), 0),
  };

  return {
    tasks,
    stats,
    loading,
    notifications,
    addTask,
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
  if (!seconds && seconds !== 0) return '--:--';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};
