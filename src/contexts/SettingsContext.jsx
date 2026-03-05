import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../supabaseClient';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
    const { user } = useAuth();

    // Safe timezone fallback
    const getDefaultTimezone = () => {
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch {
            return 'UTC';
        }
    };

    const [timezone, setTimezone] = useState('auto');
    const [timeFormat, setTimeFormat] = useState('12h');

    // Load from local storage and remote metadata when user changes
    useEffect(() => {
        if (user) {
            // Priority 1: Supabase DB Remote Cloud Metadata (syncs across laptop/mobile)
            const metaTz = user.metadata?.timezone;
            const metaFmt = user.metadata?.timeFormat;

            // Priority 2: LocalStorage Fallback (speeds up first frame)
            const savedSettings = localStorage.getItem(`settings_${user.id}`);
            let localParsed = {};
            if (savedSettings) {
                try {
                    localParsed = JSON.parse(savedSettings);
                } catch (e) {
                    console.error("Failed to parse local settings", e);
                }
            }

            if (metaTz) setTimezone(metaTz);
            else if (localParsed.timezone) setTimezone(localParsed.timezone);

            if (metaFmt) setTimeFormat(metaFmt);
            else if (localParsed.timeFormat) setTimeFormat(localParsed.timeFormat);
        }
    }, [user]);

    const updateTimezone = (newTz) => {
        setTimezone(newTz);
        saveSettings({ timezone: newTz });
    };

    const updateTimeFormat = (newFmt) => {
        setTimeFormat(newFmt);
        saveSettings({ timeFormat: newFmt });
    };

    const saveSettings = async (updates) => {
        if (user) {
            // Save rapidly to LocalStorage to ensure UI stays perfectly snappy while saving
            const current = localStorage.getItem(`settings_${user.id}`);
            const parsed = current ? JSON.parse(current) : {};
            const merged = { ...parsed, ...updates };
            localStorage.setItem(`settings_${user.id}`, JSON.stringify(merged));

            // Sync remotely to Supabase to mirror state across laptop and mobile flawlessly
            try {
                await supabase.auth.updateUser({
                    data: updates
                });
            } catch (err) {
                console.error("Failed to sync settings to cloud:", err);
            }
        }
    };

    // Calculate actual active timezone representing the context
    const activeTimezone = timezone === 'auto' ? getDefaultTimezone() : timezone;

    // Utility to convert any date into a fake "local" Date object matching the selected timezone.
    const getLocalTime = (dateObj = new Date()) => {
        try {
            return new Date(dateObj.toLocaleString('en-US', { timeZone: activeTimezone }));
        } catch (e) {
            return dateObj;
        }
    };

    // Get the UTC Date representing Midnight of the current day in the target Timezone
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

    // Global utility to format specific ISO time points precisely cleanly
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
            // fallback gracefully
            return new Date(dateString).toLocaleTimeString();
        }
    };


    return (
        <SettingsContext.Provider value={{
            timezone,
            timeFormat,
            updateTimezone,
            updateTimeFormat,
            getLocalTime,
            getStartOfDayUTC,
            formatClockTime
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
