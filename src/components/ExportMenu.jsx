import React, { useState, useRef, useEffect } from 'react';
import { formatTime } from '../hooks/useTaskManager';
import './ExportMenu.css';

const DownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const CSVIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="8" y1="13" x2="16" y2="13"/>
    <line x1="8" y1="17" x2="16" y2="17"/>
  </svg>
);

const JSONIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <path d="M8 13h2"/>
    <path d="M8 17h2"/>
    <path d="M14 13h2"/>
    <path d="M14 17h2"/>
  </svg>
);

const PDFIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <path d="M9 15v-2h2a1 1 0 1 1 0 2H9z"/>
  </svg>
);

const PrintIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 6 2 18 2 18 9"/>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8"/>
  </svg>
);

const ExportMenu = ({ tasks }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState(null);
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

  const getTaskData = () => {
    return tasks.map(task => ({
      name: task.name,
      status: task.status === 'completed' ? 'Completed' : task.status === 'running' ? 'Running' : 'Ready',
      currentTime: formatTime(task.currentTime || 0),
      bestTime: task.bestTime ? formatTime(task.bestTime) : 'N/A',
      attempts: task.attempts?.length || 0,
      totalTime: task.attempts?.reduce((a, b) => a + b, 0) || 0,
      totalTimeFormatted: formatTime(task.attempts?.reduce((a, b) => a + b, 0) || 0),
      createdAt: new Date(task.createdAt).toLocaleDateString(),
    }));
  };

  const exportCSV = () => {
    setExporting('csv');
    const data = getTaskData();
    const headers = ['Task Name', 'Status', 'Current Time', 'Best Time', 'Attempts', 'Total Time', 'Created Date'];
    const csvContent = [
      headers.join(','),
      ...data.map(row => [
        `"${row.name}"`,
        row.status,
        row.currentTime,
        row.bestTime,
        row.attempts,
        row.totalTimeFormatted,
        row.createdAt
      ].join(','))
    ].join('\n');

    downloadFile(csvContent, 'tasks-export.csv', 'text/csv');
    setTimeout(() => setExporting(null), 1000);
  };

  const exportJSON = () => {
    setExporting('json');
    const data = {
      exportDate: new Date().toISOString(),
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      tasks: getTaskData()
    };

    downloadFile(JSON.stringify(data, null, 2), 'tasks-export.json', 'application/json');
    setTimeout(() => setExporting(null), 1000);
  };

  const exportPDF = () => {
    setExporting('pdf');
    const data = getTaskData();
    const stats = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      inProgress: tasks.filter(t => t.status === 'running').length,
      totalTime: formatTime(tasks.reduce((acc, t) => acc + (t.attempts?.reduce((a, b) => a + b, 0) || 0), 0))
    };

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>TaskTracker Pro - Export</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 40px;
            color: #1a1a1a;
          }
          .header { 
            text-align: center; 
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #8b5cf6;
          }
          .header h1 { 
            color: #8b5cf6; 
            font-size: 28px;
            margin-bottom: 8px;
          }
          .header p { color: #666; }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            margin-bottom: 32px;
          }
          .stat-card {
            background: #f5f3ff;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
          }
          .stat-value { 
            font-size: 24px; 
            font-weight: 700; 
            color: #8b5cf6;
          }
          .stat-label { 
            font-size: 12px; 
            color: #666;
            text-transform: uppercase;
            margin-top: 4px;
          }
          table { 
            width: 100%; 
            border-collapse: collapse;
            margin-top: 24px;
          }
          th { 
            background: #8b5cf6; 
            color: white;
            padding: 14px 12px;
            text-align: left;
            font-weight: 600;
            font-size: 13px;
          }
          td { 
            padding: 12px;
            border-bottom: 1px solid #e5e5e5;
            font-size: 14px;
          }
          tr:nth-child(even) { background: #fafafa; }
          .status { 
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
          }
          .status-completed { background: #dcfce7; color: #16a34a; }
          .status-running { background: #dbeafe; color: #2563eb; }
          .status-ready { background: #f3f4f6; color: #6b7280; }
          .footer { 
            margin-top: 40px;
            text-align: center;
            color: #999;
            font-size: 12px;
          }
          @media print {
            body { padding: 20px; }
            .stat-card { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>TaskTracker Pro</h1>
          <p>Task Export Report - ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${stats.total}</div>
            <div class="stat-label">Total Tasks</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.completed}</div>
            <div class="stat-label">Completed</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.inProgress}</div>
            <div class="stat-label">In Progress</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.totalTime}</div>
            <div class="stat-label">Total Time</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Task Name</th>
              <th>Status</th>
              <th>Best Time</th>
              <th>Attempts</th>
              <th>Total Time</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(task => `
              <tr>
                <td><strong>${task.name}</strong></td>
                <td><span class="status status-${task.status.toLowerCase()}">${task.status}</span></td>
                <td>${task.bestTime}</td>
                <td>${task.attempts}</td>
                <td>${task.totalTimeFormatted}</td>
                <td>${task.createdAt}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Generated by TaskTracker Pro • ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    printWindow.onload = () => {
      printWindow.print();
    };
    
    setTimeout(() => setExporting(null), 1000);
  };

  const printTasks = () => {
    setExporting('print');
    exportPDF();
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

  return (
    <div className="export-menu" ref={menuRef}>
      <button 
        className="export-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title="Export Tasks"
      >
        <DownloadIcon />
        <span>Export</span>
      </button>

      {isOpen && (
        <div className="export-dropdown">
          <div className="export-header">
            <h4>Export Tasks</h4>
            <p>Choose export format</p>
          </div>
          
          <div className="export-options">
            <button 
              className="export-option"
              onClick={exportCSV}
              disabled={exporting === 'csv'}
            >
              <div className="export-option-icon csv">
                <CSVIcon />
              </div>
              <div className="export-option-info">
                <span className="export-option-title">CSV File</span>
                <span className="export-option-desc">Spreadsheet compatible</span>
              </div>
              {exporting === 'csv' && <span className="export-loading">✓</span>}
            </button>

            <button 
              className="export-option"
              onClick={exportJSON}
              disabled={exporting === 'json'}
            >
              <div className="export-option-icon json">
                <JSONIcon />
              </div>
              <div className="export-option-info">
                <span className="export-option-title">JSON File</span>
                <span className="export-option-desc">For developers & APIs</span>
              </div>
              {exporting === 'json' && <span className="export-loading">✓</span>}
            </button>

            <button 
              className="export-option"
              onClick={exportPDF}
              disabled={exporting === 'pdf'}
            >
              <div className="export-option-icon pdf">
                <PDFIcon />
              </div>
              <div className="export-option-info">
                <span className="export-option-title">PDF Report</span>
                <span className="export-option-desc">Printable document</span>
              </div>
              {exporting === 'pdf' && <span className="export-loading">✓</span>}
            </button>

            <div className="export-divider"></div>

            <button 
              className="export-option"
              onClick={printTasks}
              disabled={exporting === 'print'}
            >
              <div className="export-option-icon print">
                <PrintIcon />
              </div>
              <div className="export-option-info">
                <span className="export-option-title">Print</span>
                <span className="export-option-desc">Print directly</span>
              </div>
            </button>
          </div>

          <div className="export-footer">
            <span>{tasks.length} tasks will be exported</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportMenu;
