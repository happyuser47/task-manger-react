import React, { useState, useRef, useEffect } from 'react';
import { formatTime } from '../hooks/useTaskManager';
import './ExportMenu.css';

const DownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const CSVIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="16" y2="17" />
  </svg>
);

const JSONIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="M8 13h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2H8" />
    <path d="M14 13h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2" />
  </svg>
);

const PDFIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <circle cx="9" cy="15" r="1" />
    <path d="M12 11h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2" />
  </svg>
);

const PrintIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ExportMenu = ({ tasks, sessions = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempFormat, setTempFormat] = useState(null);
  const [exporting, setExporting] = useState(null);

  // Date range states
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getFilteredData = () => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const filteredTasks = tasks.filter(task => {
      const taskDate = new Date(task.createdAt);
      return taskDate >= start && taskDate <= end;
    });

    const filteredSessions = sessions.filter(session => {
      const sessionDate = new Date(session.check_in);
      return sessionDate >= start && sessionDate <= end;
    });

    return { filteredTasks, filteredSessions };
  };

  const formatDurationRaw = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  const handleExportClick = (format) => {
    setTempFormat(format);
    setShowDatePicker(true);
    setIsOpen(false);
  };

  const processExport = () => {
    const { filteredTasks, filteredSessions } = getFilteredData();

    if (tempFormat === 'csv') exportCSV(filteredTasks, filteredSessions);
    if (tempFormat === 'json') exportJSON(filteredTasks, filteredSessions);
    if (tempFormat === 'pdf' || tempFormat === 'print') exportPDF(filteredTasks, filteredSessions, tempFormat === 'print');

    setShowDatePicker(false);
    setTempFormat(null);
  };

  const exportCSV = (filteredTasks, filteredSessions) => {
    setExporting('csv');

    // Tasks CSV
    let csvContent = "DATA TYPE,NAME,STATUS,CURRENT TIME,BEST TIME,ATTEMPTS,TOTAL TIME,DATE\n";

    filteredTasks.forEach(task => {
      const totalTime = task.attempts?.reduce((a, b) => a + b, 0) || 0;
      csvContent += `TASK,"${task.name}",${task.status},${formatTime(task.currentTime || 0)},${task.bestTime ? formatTime(task.bestTime) : 'N/A'},${task.attempts?.length || 0},${formatTime(totalTime)},${new Date(task.createdAt).toLocaleDateString()}\n`;
    });

    // Sessions CSV
    csvContent += "\nDATA TYPE,CHECK IN,CHECK OUT,DURATION,REASON,DATE\n";
    filteredSessions.forEach(session => {
      const duration = session.duration || 0;
      csvContent += `SESSION,${new Date(session.check_in).toLocaleTimeString()},${session.check_out ? new Date(session.check_out).toLocaleTimeString() : 'Active'},${formatDurationRaw(duration)},"${session.reason || ''}",${new Date(session.check_in).toLocaleDateString()}\n`;
    });

    downloadFile(csvContent, `export-${startDate}-to-${endDate}.csv`, 'text/csv');
    setTimeout(() => setExporting(null), 1000);
  };

  const exportJSON = (filteredTasks, filteredSessions) => {
    setExporting('json');
    const data = {
      exportInfo: {
        generatedAt: new Date().toISOString(),
        rangeStart: startDate,
        rangeEnd: endDate,
        summary: {
          tasksCount: filteredTasks.length,
          sessionsCount: filteredSessions.length,
          totalWorkTime: filteredSessions.reduce((acc, s) => acc + (s.duration || 0), 0)
        }
      },
      tasks: filteredTasks,
      sessions: filteredSessions
    };

    downloadFile(JSON.stringify(data, null, 2), `export-${startDate}-to-${endDate}.json`, 'application/json');
    setTimeout(() => setExporting(null), 1000);
  };

  const exportPDF = (filteredTasks, filteredSessions, isPrint = false) => {
    setExporting(isPrint ? 'print' : 'pdf');

    const totalWorkTime = filteredSessions.reduce((acc, s) => acc + (s.duration || 0), 0);
    const completedTasks = filteredTasks.filter(t => t.status === 'completed').length;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Performance Report: ${startDate} to ${endDate}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Inter', sans-serif;
            padding: 40px;
            color: #1f2937;
            background: #fff;
            line-height: 1.5;
          }
          .header { 
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #8b5cf6;
          }
          .header-left h1 { 
            color: #8b5cf6; 
            font-size: 32px;
            font-weight: 800;
            letter-spacing: -1px;
          }
          .header-right { text-align: right; color: #6b7280; font-size: 14px; }
          
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            margin-bottom: 40px;
          }
          .stat-card {
            background: #f8fafc;
            padding: 20px;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
          }
          .stat-value { font-size: 20px; font-weight: 700; color: #1f2937; font-family: 'JetBrains Mono', monospace; }
          .stat-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
          
          h2 { font-size: 18px; font-weight: 700; margin: 32px 0 16px; color: #4b5563; display: flex; align-items: center; gap: 8px; }
          h2::before { content: ""; width: 4px; height: 18px; background: #8b5cf6; border-radius: 2px; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 32px; font-size: 13px; }
          th { background: #f1f5f9; color: #475569; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e2e8f0; }
          td { padding: 12px; border-bottom: 1px solid #f1f5f9; }
          tr:nth-child(even) { background: #fcfcfd; }
          
          .status { padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
          .status-completed { background: #dcfce7; color: #15803d; }
          .status-running { background: #dbeafe; color: #1d4ed8; }
          .status-ready { background: #f1f5f9; color: #475569; }
          
          .duration { font-family: 'JetBrains Mono', monospace; color: #8b5cf6; font-weight: 600; }
          .reason { color: #6b7280; font-style: italic; font-size: 12px; }
          
          .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <h1>FocusFlow</h1>
            <p>Performance & Work Report</p>
          </div>
          <div class="header-right">
            <p>Range: <strong>${new Date(startDate).toLocaleDateString()}</strong> - <strong>${new Date(endDate).toLocaleDateString()}</strong></p>
            <p>Generated: ${new Date().toLocaleString()}</p>
          </div>
        </div>
        
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${filteredTasks.length}</div>
            <div class="stat-label">Total Tasks</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${completedTasks}</div>
            <div class="stat-label">Completed</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${filteredSessions.length}</div>
            <div class="stat-label">Work Sessions</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${formatDurationRaw(totalWorkTime)}</div>
            <div class="stat-label">Total Work Time</div>
          </div>
        </div>

        <h2>Task Breakdown</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 40%">Task Name</th>
              <th>Status</th>
              <th>Current Time</th>
              <th>Best Time</th>
              <th>Total Focus</th>
            </tr>
          </thead>
          <tbody>
            ${filteredTasks.map(task => {
      const totalTime = task.attempts?.reduce((a, b) => a + b, 0) || 0;
      return `
              <tr>
                <td><strong>${task.name}</strong><br/><small style="color: #94a3b8">${new Date(task.createdAt).toLocaleDateString()}</small></td>
                <td><span class="status status-${task.status.toLowerCase()}">${task.status}</span></td>
                <td>${formatTime(task.currentTime || 0)}</td>
                <td>${task.bestTime ? formatTime(task.bestTime) : 'N/A'}</td>
                <td class="duration">${formatTime(totalTime)}</td>
              </tr>
            `}).join('')}
          </tbody>
        </table>

        <h2>Work Session History</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Time Window</th>
              <th>Duration</th>
              <th>Break Reason</th>
            </tr>
          </thead>
          <tbody>
            ${filteredSessions.map(session => `
              <tr>
                <td>${new Date(session.check_in).toLocaleDateString()}</td>
                <td>${new Date(session.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${session.check_out ? new Date(session.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}</td>
                <td class="duration">${formatDurationRaw(session.duration || 0)}</td>
                <td class="reason">${session.reason || 'No specific focus defined'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Confidence through tracking. FocusFlow &copy; ${new Date().getFullYear()}</p>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        if (isPrint) printWindow.print();
      };
    }

    setTimeout(() => setExporting(null), 1000);
  };

  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const { filteredTasks, filteredSessions } = getFilteredData();

  return (
    <div className="export-menu" ref={menuRef}>
      <button
        className="export-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title="Export Data"
      >
        <DownloadIcon />
        <span>Export</span>
      </button>

      {isOpen && (
        <div className="export-dropdown">
          <div className="export-header">
            <h4>Application Export</h4>
            <p>Select your preferred format</p>
          </div>

          <div className="export-options">
            <button className="export-option" onClick={() => handleExportClick('csv')}>
              <div className="export-option-icon csv"><CSVIcon /></div>
              <div className="export-option-info">
                <span className="export-option-title">CSV Spreadsheet</span>
                <span className="export-option-desc">Perfect for Excel/Sheets</span>
              </div>
            </button>

            <button className="export-option" onClick={() => handleExportClick('json')}>
              <div className="export-option-icon json"><JSONIcon /></div>
              <div className="export-option-info">
                <span className="export-option-title">JSON Data</span>
                <span className="export-option-desc">Universal raw data format</span>
              </div>
            </button>

            <button className="export-option" onClick={() => handleExportClick('pdf')}>
              <div className="export-option-icon pdf"><PDFIcon /></div>
              <div className="export-option-info">
                <span className="export-option-title">Professional PDF</span>
                <span className="export-option-desc">Beautifully styled report</span>
              </div>
            </button>

            <div className="export-divider"></div>

            <button className="export-option" onClick={() => handleExportClick('print')}>
              <div className="export-option-icon print"><PrintIcon /></div>
              <div className="export-option-info">
                <span className="export-option-title">Quick Print</span>
                <span className="export-option-desc">Send directly to printer</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Date Range Modal */}
      {showDatePicker && (
        <div className="export-modal-overlay">
          <div className="export-modal">
            <div className="export-modal-header">
              <h3>Export Options</h3>
              <button className="btn-close-modal" onClick={() => setShowDatePicker(false)}>
                <CloseIcon />
              </button>
            </div>

            <div className="export-modal-body">
              <div className="date-range-inputs">
                <div className="date-input-group">
                  <label>From Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="date-input-group">
                  <label>To Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="export-data-summary">
                <p><span>Tasks to export:</span> <strong>{filteredTasks.length}</strong></p>
                <p><span>Sessions to export:</span> <strong>{filteredSessions.length}</strong></p>
              </div>
            </div>

            <div className="export-modal-footer">
              <button className="btn-modal-cancel" onClick={() => setShowDatePicker(false)}>Cancel</button>
              <button className="btn-modal-export" onClick={processExport}>
                Generate {tempFormat?.toUpperCase()} Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportMenu;
