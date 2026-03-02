import React from 'react';
import ThemeToggle from './ThemeToggle';
import whiteLogo from '../assets/White_logo.png';
import blackLogo from '../assets/Black_logo.png';

const Header = ({ theme, onToggleTheme, children }) => {
  return (
    <header className="header">
      <div className="header-actions">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        {children}
      </div>

      <div className="header-content">
        <div className="main-logo-container">
          <img
            src={theme === 'dark' ? whiteLogo : blackLogo}
            alt="FocusFlow Logo"
            className="header-main-logo"
          />
        </div>

        <div className="header-badge">
          Laser Focus
        </div>

        <h1>FocusFlow</h1>
        <p>Track your tasks, beat your best times, and supercharge your productivity</p>
      </div>
    </header>
  );
};

export default Header;
