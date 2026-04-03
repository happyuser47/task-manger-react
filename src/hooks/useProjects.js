import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const PROJECT_COLORS = [
  '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899',
  '#14b8a6', '#f97316', '#6366f1', '#06b6d4', '#84cc16',
];

export const useProjects = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setProjects(data);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('projects_realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'projects', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setProjects(prev => [...prev, payload.new]);
          } else if (payload.eventType === 'DELETE') {
            setProjects(prev => prev.filter(p => p.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            setProjects(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
          }
        }
      ).subscribe();

    return () => subscription.unsubscribe();
  }, [user]);

  const addProject = useCallback(async (name, description = '', color = null) => {
    if (!name.trim() || !user) return null;

    const finalColor = color || PROJECT_COLORS[projects.length % PROJECT_COLORS.length];

    const { data, error } = await supabase
      .from('projects')
      .insert([{
        user_id: user.id,
        name: name.trim(),
        description: description.trim() || null,
        color: finalColor,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding project:', error);
      return null;
    }
    // Optimistic: realtime will also push it
    setProjects(prev => [...prev, data]);
    return data;
  }, [user, projects.length]);

  const updateProject = useCallback(async (id, updates) => {
    if (!user) return false;
    const { error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id);

    if (!error) {
      setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    }
    return !error;
  }, [user]);

  const deleteProject = useCallback(async (id) => {
    if (!user) return false;
    // Tasks with this project_id will cascade delete via DB constraint
    setProjects(prev => prev.filter(p => p.id !== id));

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting project:', error);
      fetchProjects(); // revert
      return false;
    }
    return true;
  }, [user, fetchProjects]);

  return {
    projects,
    loading,
    addProject,
    updateProject,
    deleteProject,
    fetchProjects,
    PROJECT_COLORS,
  };
};
