import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

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

    const [timezone, setTimezone] = useState(getDefaultTimezone());

    // Load from local storage when user changes
    useEffect(() => {
        if (user) {
            const savedSettings = localStorage.getItem(`settings_${user.id}`);
            if (savedSettings) {
                try {
                    const parsed = JSON.parse(savedSettings);
                    if (parsed.timezone) setTimezone(parsed.timezone);
                } catch (e) {
                    console.error("Failed to parse settings", e);
                }
            }
        }
    }, [user]);

    const updateTimezone = (newTz) => {
        setTimezone(newTz);
        if (user) {
            const current = localStorage.getItem(`settings_${user.id}`);
            const parsed = current ? JSON.parse(current) : {};
            localStorage.setItem(`settings_${user.id}`, JSON.stringify({ ...parsed, timezone: newTz }));
        }
    };

    // Utility to convert any date into a fake "local" Date object matching the selected timezone.
    const getLocalTime = (dateObj = new Date()) => {
        try {
            return new Date(dateObj.toLocaleString('en-US', { timeZone: timezone }));
        } catch (e) {
            // Fallback for invalid timezones just in case
            return dateObj;
        }
    };

    // Get the UTC Date representing Midnight of the current day in the target Timezone
    const getStartOfDayUTC = (dateObj = new Date()) => {
        try {
            const tzDateStr = dateObj.toLocaleString('en-US', { timeZone: timezone });
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

    return (
        <SettingsContext.Provider value={{ timezone, updateTimezone, getLocalTime, getStartOfDayUTC }}>
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
