import React from 'react';
import ThemeToggle from './ThemeToggle';

const Header = ({ theme, onToggleTheme, children }) => {
  return (
    <header className="header">
      <div className="header-actions">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        {children}
      </div>

      <div className="header-content">
        <div className="header-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          Elite Focus
        </div>

        <h1>FocusFlow</h1>
        <p>Track your tasks, beat your best times, and supercharge your productivity</p>
      </div>
    </header>
  );
};

export default Header;
