import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const WorkSessionContext = createContext();

export const WorkSessionProvider = ({ children }) => {
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

    // Fetch all session history
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

    // Fetch active session and today's sessions
    const loadInitialData = useCallback(async () => {
        if (!user) {
            setCurrentSession(null);
            setSessionDuration(0);
            setLoading(false);
            return;
        }

        setLoading(true);

        // Get active session
        const { data: activeSession, error: activeError } = await supabase
            .from('work_sessions')
            .select('*')
            .eq('user_id', user.id)
            .is('check_out', null)
            .order('check_in', { ascending: false })
            .limit(1)
            .single();

        if (activeSession) {
            setCurrentSession(activeSession);
            const checkInTime = new Date(activeSession.check_in).getTime();
            setSessionDuration(Math.floor((Date.now() - checkInTime) / 1000));
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

        // Also prime allSessions for export functionality
        await fetchSessionHistory('all');

        setLoading(false);
    }, [user, fetchSessionHistory]);

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    // Update duration every second when checked in
    useEffect(() => {
        if (!currentSession) return;

        const interval = setInterval(() => {
            const checkInTime = new Date(currentSession.check_in).getTime();
            setSessionDuration(Math.floor((Date.now() - checkInTime) / 1000));
        }, 1000);

        return () => clearInterval(interval);
    }, [currentSession]);

    const checkIn = useCallback(async () => {
        if (!user || currentSession) return;

        const now = new Date().toISOString();
        const { data, error } = await supabase
            .from('work_sessions')
            .insert([{ user_id: user.id, check_in: now }])
            .select()
            .single();

        if (!error) {
            setCurrentSession(data);
            setSessionDuration(0);
            setTodaySessions(prev => [data, ...prev]);
        }
        return { success: !error, data, error };
    }, [user, currentSession]);

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

        if (!error) {
            setCurrentSession(null);
            setSessionDuration(0);

            // Update local state IMMEDIATELY
            setTodaySessions(prev => prev.map(s => s.id === data.id ? data : s));

            // Refresh history to sink with everything
            await fetchSessionHistory('all');
        }
        return { success: !error, data, error };
    }, [user, currentSession, fetchSessionHistory]);

    const deleteSession = useCallback(async (sessionId) => {
        if (!user) return { success: false };

        const { error } = await supabase
            .from('work_sessions')
            .delete()
            .eq('id', sessionId)
            .eq('user_id', user.id);

        if (!error) {
            setTodaySessions(prev => prev.filter(s => s.id !== sessionId));
            await fetchSessionHistory('all');
            return { success: true };
        }
        return { success: false, error };
    }, [user, fetchSessionHistory]);

    const deleteSessionsInRange = useCallback(async (range) => {
        if (!user) return { success: false };

        let query = supabase
            .from('work_sessions')
            .delete()
            .eq('user_id', user.id)
            .not('check_out', 'is', null);

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

        const { error } = await query;
        if (!error) {
            await fetchSessionHistory('all');
            // If range covers today, refresh todaySessions too
            if (range === 'all' || range === 'today' || range === 'week' || range === 'month') {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const { data } = await supabase
                    .from('work_sessions')
                    .select('*')
                    .eq('user_id', user.id)
                    .gte('check_in', today.toISOString());
                setTodaySessions(data || []);
            }
            return { success: true };
        }
        return { success: false, error };
    }, [user, fetchSessionHistory]);

    const getTotalTimeToday = useCallback(() => {
        let total = 0;
        todaySessions.forEach(session => {
            if (session.check_out) {
                total += session.duration || 0;
            } else if (session.id === currentSession?.id) {
                total += sessionDuration;
            }
        });
        return total;
    }, [todaySessions, currentSession, sessionDuration]);

    const value = {
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
        deleteSession,
        deleteSessionsInRange,
        fetchSessionHistory,
        getTotalTimeToday
    };

    return (
        <WorkSessionContext.Provider value={value}>
            {children}
        </WorkSessionContext.Provider>
    );
};

export const useWorkSessionContext = () => {
    const context = useContext(WorkSessionContext);
    if (!context) {
        throw new Error('useWorkSessionContext must be used within a WorkSessionProvider');
    }
    return context;
};
