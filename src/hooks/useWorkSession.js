import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export const useWorkSession = () => {
  const { user } = useAuth();
  const [currentSession, setCurrentSession] = useState(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [todaySessions, setTodaySessions] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    totalSessions: 0,
    totalTime: 0,
    avgSessionTime: 0
  });

  // Fetch active session and today's sessions
  useEffect(() => {
    if (!user) {
      setCurrentSession(null);
      setSessionDuration(0);
      setLoading(false);
      return;
    }

    const fetchSessions = async () => {
      setLoading(true);

      // Get active session (no check_out)
      const { data: activeSession, error: activeError } = await supabase
        .from('work_sessions')
        .select('*')
        .eq('user_id', user.id)
        .is('check_out', null)
        .order('check_in', { ascending: false })
        .limit(1)
        .single();

      if (activeError && activeError.code !== 'PGRST116') {
        console.error('Error fetching active session:', activeError);
      }

      if (activeSession) {
        setCurrentSession(activeSession);
        // Calculate duration from check_in time
        const checkInTime = new Date(activeSession.check_in).getTime();
        const elapsed = Math.floor((Date.now() - checkInTime) / 1000);
        setSessionDuration(elapsed);
      } else {
        setCurrentSession(null);
        setSessionDuration(0);
      }

      // Get today's completed sessions
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: todayData, error: todayError } = await supabase
        .from('work_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('check_in', today.toISOString())
        .order('check_in', { ascending: false });

      if (!todayError && todayData) {
        setTodaySessions(todayData);
      }

      setLoading(false);
    };

    fetchSessions();
  }, [user]);

  // Update duration every second when checked in
  useEffect(() => {
    if (!currentSession) return;

    const interval = setInterval(() => {
      const checkInTime = new Date(currentSession.check_in).getTime();
      const elapsed = Math.floor((Date.now() - checkInTime) / 1000);
      setSessionDuration(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentSession]);

  // Check in
  const checkIn = useCallback(async () => {
    if (!user || currentSession) return;

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('work_sessions')
      .insert([{ user_id: user.id, check_in: now }])
      .select()
      .single();

    if (error) {
      console.error('Error checking in:', error);
      return { success: false, error };
    }

    setCurrentSession(data);
    setSessionDuration(0);
    setTodaySessions(prev => [data, ...prev]);

    return { success: true, data };
  }, [user, currentSession]);

  // Check out with reason
  const checkOut = useCallback(async (reason = '') => {
    if (!user || !currentSession) return;

    const now = new Date().toISOString();
    const checkInTime = new Date(currentSession.check_in).getTime();
    const duration = Math.floor((Date.now() - checkInTime) / 1000);

    const { data, error } = await supabase
      .from('work_sessions')
      .update({
        check_out: now,
        reason: reason.trim() || null,
        duration: duration
      })
      .eq('id', currentSession.id)
      .select()
      .single();

    if (error) {
      console.error('Error checking out:', error);
      return { success: false, error };
    }

    setCurrentSession(null);
    setSessionDuration(0);
    setTodaySessions(prev =>
      prev.map(s => s.id === data.id ? data : s)
    );

    return { success: true, data };
  }, [user, currentSession]);

  // Fetch all session history with date filter
  const fetchSessionHistory = useCallback(async (filter = 'all', limit = 100) => {
    if (!user) return { data: [], error: null };

    setHistoryLoading(true);

    let query = supabase
      .from('work_sessions')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .not('check_out', 'is', null)
      .order('check_in', { ascending: false });

    // Apply date filters
    const now = new Date();
    if (filter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query = query.gte('check_in', today.toISOString());
    } else if (filter === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);
      query = query.gte('check_in', weekAgo.toISOString());
    } else if (filter === 'month') {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      monthAgo.setHours(0, 0, 0, 0);
      query = query.gte('check_in', monthAgo.toISOString());
    }

    query = query.limit(limit);

    const { data, error, count } = await query;

    setHistoryLoading(false);

    if (error) {
      console.error('Error fetching session history:', error);
      return { data: [], error, count: 0 };
    }

    // Calculate stats
    const totalTime = (data || []).reduce((acc, session) => {
      if (session.check_out) {
        const checkIn = new Date(session.check_in).getTime();
        const checkOut = new Date(session.check_out).getTime();
        return acc + Math.floor((checkOut - checkIn) / 1000);
      }
      return acc;
    }, 0);

    setSessionStats({
      totalSessions: data?.length || 0,
      totalTime,
      avgSessionTime: data?.length ? Math.floor(totalTime / data.length) : 0
    });

    setAllSessions(data || []);
    return { data: data || [], error: null, count };
  }, [user]);

  // Delete a session
  const deleteSession = useCallback(async (sessionId) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      // First, verify the session exists and belongs to the user
      const { data: existingSession, error: fetchError } = await supabase
        .from('work_sessions')
        .select('id')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !existingSession) {
        console.error('Session not found or access denied:', fetchError);
        return { success: false, error: 'Session not found' };
      }

      // Perform the delete
      const { error: deleteError } = await supabase
        .from('work_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Error deleting session:', deleteError);
        return { success: false, error: deleteError.message };
      }

      // Update local state immediately
      setAllSessions(prev => {
        const updated = prev.filter(s => s.id !== sessionId);

        // Recalculate stats
        const totalTime = updated.reduce((acc, session) => {
          if (session.check_out) {
            const checkIn = new Date(session.check_in).getTime();
            const checkOut = new Date(session.check_out).getTime();
            return acc + Math.floor((checkOut - checkIn) / 1000);
          }
          return acc;
        }, 0);

        setSessionStats({
          totalSessions: updated.length,
          totalTime,
          avgSessionTime: updated.length ? Math.floor(totalTime / updated.length) : 0
        });

        return updated;
      });

      setTodaySessions(prev => prev.filter(s => s.id !== sessionId));

      return { success: true };
    } catch (err) {
      console.error('Unexpected error deleting session:', err);
      return { success: false, error: 'Unexpected error occurred' };
    }
  }, [user]);

  // Calculate total time today
  const getTotalTimeToday = useCallback(() => {
    let total = 0;

    todaySessions.forEach(session => {
      if (session.check_out) {
        const checkIn = new Date(session.check_in).getTime();
        const checkOut = new Date(session.check_out).getTime();
        total += Math.floor((checkOut - checkIn) / 1000);
      } else if (session.id === currentSession?.id) {
        total += sessionDuration;
      }
    });

    return total;
  }, [todaySessions, currentSession, sessionDuration]);

  // Delete sessions in a given range
  const deleteSessionsInRange = useCallback(async (range) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      let query = supabase
        .from('work_sessions')
        .delete()
        .eq('user_id', user.id)
        .not('check_out', 'is', null); // Only delete completed sessions

      if (range === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        query = query.gte('check_in', today.toISOString());
      } else if (range === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        weekAgo.setHours(0, 0, 0, 0);
        query = query.gte('check_in', weekAgo.toISOString());
      } else if (range === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        monthAgo.setHours(0, 0, 0, 0);
        query = query.gte('check_in', monthAgo.toISOString());
      }
      // 'all' range doesn't need a gte filter

      const { error } = await query;

      if (error) {
        console.error('Error deleting sessions in range:', error);
        return { success: false, error: error.message };
      }

      // Refresh data to update local state and stats
      await fetchSessionHistory('all'); // Always refresh 'all' to ensure stats are correct

      return { success: true };
    } catch (err) {
      console.error('Unexpected error in deleteSessionsInRange:', err);
      return { success: false, error: 'Unexpected error occurred' };
    }
  }, [user, fetchSessionHistory]);

  return {
    currentSession,
    sessionDuration,
    todaySessions,
    allSessions,
    sessionStats,
    loading,
    historyLoading,
    isCheckedIn: !!currentSession,
    checkIn,
    checkOut,
    getTotalTimeToday,
    fetchSessionHistory,
    deleteSession,
    deleteSessionsInRange,
  };
};

// Format duration helper
export const formatDuration = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs}s`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
};

export const formatTime = (isoString) => {
  if (!isoString) return '--:--';
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};
