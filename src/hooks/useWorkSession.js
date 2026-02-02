import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export const useWorkSession = () => {
  const { user } = useAuth();
  const [currentSession, setCurrentSession] = useState(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [todaySessions, setTodaySessions] = useState([]);

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

  // Check out
  const checkOut = useCallback(async () => {
    if (!user || !currentSession) return;

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('work_sessions')
      .update({ check_out: now })
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

  return {
    currentSession,
    sessionDuration,
    todaySessions,
    loading,
    isCheckedIn: !!currentSession,
    checkIn,
    checkOut,
    getTotalTimeToday,
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
