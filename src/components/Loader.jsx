import React from 'react';
import './Loader.css';
import whiteLogo from '../assets/White_logo.png';
import blackLogo from '../assets/Black_logo.png';
import { useTheme } from '../hooks/useTheme';

const Loader = ({ message = 'Initialising...', inline = false }) => {
  const { theme } = useTheme();

  return (
    <div className={`loader-container ${inline ? 'inline' : ''}`}>
      <div className="loader-content">
        <div className="loader-visual">
          <div className="loader-pulse"></div>
          <div className="loader-rings">
            <div className="ring ring-1"></div>
            <div className="ring ring-2"></div>
            <div className="ring ring-3"></div>
          </div>
          <div className="loader-logo-wrapper">
            <img
              src={theme === 'dark' ? whiteLogo : blackLogo}
              alt="FocusFlow"
              className="loader-logo-img"
            />
          </div>
        </div>

        <div className="loader-text">
          {!inline && <h2>FocusFlow</h2>}
          <p>{message}</p>
        </div>

        <div className="loader-progress-bar">
          <div className="progress-fill"></div>
        </div>
      </div>
    </div>
  );
};

export default Loader;
