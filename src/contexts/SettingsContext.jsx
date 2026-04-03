import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../supabaseClient';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
    const { user } = useAuth();
    const [settingsLoaded, setSettingsLoaded] = useState(false);
    const debounceRef = useRef(null);

    // Safe timezone fallback
    const getDefaultTimezone = () => {
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch {
            return 'UTC';
        }
    };

    // --- All Settings State ---
    const [timezone, setTimezone] = useState('auto');
    const [timeFormat, setTimeFormat] = useState('12h');
    const [theme, setTheme] = useState('dark');

    // Pomodoro settings
    const [pomodoroFocusDuration, setPomodoroFocusDuration] = useState(25);
    const [pomodoroShortBreak, setPomodoroShortBreak] = useState(5);
    const [pomodoroLongBreak, setPomodoroLongBreak] = useState(15);
    const [pomodoroTickEnabled, setPomodoroTickEnabled] = useState(true);
    const [pomodoroSessionsCompleted, setPomodoroSessionsCompleted] = useState(0);

    // --- Load settings from Supabase on login ---
    useEffect(() => {
        if (!user) {
            setSettingsLoaded(false);
            return;
        }

        const loadSettings = async () => {
            try {
                // Try to fetch existing settings
                const { data, error } = await supabase
                    .from('user_settings')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                if (error && error.code === 'PGRST116') {
                    // No row found — create default settings for this user
                    const { data: newData } = await supabase
                        .from('user_settings')
                        .insert({ user_id: user.id })
                        .select()
                        .single();

                    if (newData) applySettings(newData);
                } else if (data) {
                    applySettings(data);
                }
            } catch (err) {
                console.error('Failed to load settings:', err);
                // Fall back to localStorage
                loadLocalSettings();
            }
            setSettingsLoaded(true);
        };

        loadSettings();
    }, [user]);

    const applySettings = (data) => {
        if (data.timezone) setTimezone(data.timezone);
        if (data.time_format) setTimeFormat(data.time_format);
        if (data.theme) setTheme(data.theme);
        if (data.pomodoro_focus_duration != null) setPomodoroFocusDuration(data.pomodoro_focus_duration);
        if (data.pomodoro_short_break != null) setPomodoroShortBreak(data.pomodoro_short_break);
        if (data.pomodoro_long_break != null) setPomodoroLongBreak(data.pomodoro_long_break);
        if (data.pomodoro_tick_enabled != null) setPomodoroTickEnabled(data.pomodoro_tick_enabled);
        if (data.pomodoro_sessions_completed != null) setPomodoroSessionsCompleted(data.pomodoro_sessions_completed);

        // Also mirror to localStorage for fast loading next time
        if (user) {
            localStorage.setItem(`settings_${user.id}`, JSON.stringify(data));
        }
    };

    const loadLocalSettings = () => {
        if (!user) return;
        const saved = localStorage.getItem(`settings_${user.id}`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                applySettings(parsed);
            } catch (e) {
                console.error('Failed to parse local settings', e);
            }
        }
    };

    // --- Save to Supabase (debounced to avoid rapid writes) ---
    const saveToSupabase = useCallback(async (updates) => {
        if (!user) return;

        // Immediately save to localStorage for fast UI
        const current = localStorage.getItem(`settings_${user.id}`);
        const parsed = current ? JSON.parse(current) : {};
        const merged = { ...parsed, ...updates };
        localStorage.setItem(`settings_${user.id}`, JSON.stringify(merged));

        // Debounce Supabase writes (500ms)
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            try {
                await supabase
                    .from('user_settings')
                    .update(updates)
                    .eq('user_id', user.id);
            } catch (err) {
                console.error('Failed to sync settings to Supabase:', err);
            }
        }, 500);
    }, [user]);

    // --- Individual update functions ---
    const updateTimezone = (newTz) => {
        setTimezone(newTz);
        saveToSupabase({ timezone: newTz });
    };

    const updateTimeFormat = (newFmt) => {
        setTimeFormat(newFmt);
        saveToSupabase({ time_format: newFmt });
    };

    const updateTheme = (newTheme) => {
        setTheme(newTheme);
        saveToSupabase({ theme: newTheme });
    };

    const updatePomodoroSettings = (updates) => {
        const mapping = {
            focus: { state: setPomodoroFocusDuration, db: 'pomodoro_focus_duration' },
            shortBreak: { state: setPomodoroShortBreak, db: 'pomodoro_short_break' },
            longBreak: { state: setPomodoroLongBreak, db: 'pomodoro_long_break' },
            tickEnabled: { state: setPomodoroTickEnabled, db: 'pomodoro_tick_enabled' },
            sessionsCompleted: { state: setPomodoroSessionsCompleted, db: 'pomodoro_sessions_completed' },
        };

        const dbUpdates = {};
        for (const [key, value] of Object.entries(updates)) {
            if (mapping[key]) {
                mapping[key].state(value);
                dbUpdates[mapping[key].db] = value;
            }
        }

        if (Object.keys(dbUpdates).length > 0) {
            saveToSupabase(dbUpdates);
        }
    };

    // --- Timezone utilities ---
    const activeTimezone = timezone === 'auto' ? getDefaultTimezone() : timezone;

    const getLocalTime = (dateObj = new Date()) => {
        try {
            return new Date(dateObj.toLocaleString('en-US', { timeZone: activeTimezone }));
        } catch (e) {
            return dateObj;
        }
    };

    const getStartOfDayUTC = (dateObj = new Date()) => {
        try {
            const tzDateStr = dateObj.toLocaleString('en-US', { timeZone: activeTimezone });
            const tzDate = new Date(tzDateStr);
            const offset = tzDate.getTime() - dateObj.getTime();
            tzDate.setHours(0, 0, 0, 0);
            return new Date(tzDate.getTime() - offset);
        } catch (e) {
            const d = new Date(dateObj);
            d.setHours(0, 0, 0, 0);
            return d;
        }
    };

    const formatClockTime = (dateString) => {
        if (!dateString) return '--:--';
        try {
            return new Date(dateString).toLocaleTimeString('en-US', {
                timeZone: activeTimezone,
                hour: '2-digit',
                minute: '2-digit',
                hour12: timeFormat === '12h'
            });
        } catch (e) {
            return new Date(dateString).toLocaleTimeString();
        }
    };

    return (
        <SettingsContext.Provider value={{
            // State
            settingsLoaded,
            timezone,
            timeFormat,
            theme,
            pomodoroFocusDuration,
            pomodoroShortBreak,
            pomodoroLongBreak,
            pomodoroTickEnabled,
            pomodoroSessionsCompleted,
            
            // Updaters
            updateTimezone,
            updateTimeFormat,
            updateTheme,
            updatePomodoroSettings,

            // Utilities
            getLocalTime,
            getStartOfDayUTC,
            formatClockTime,
        }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettingsContext = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettingsContext must be used within a SettingsProvider');
    }
    return context;
};
