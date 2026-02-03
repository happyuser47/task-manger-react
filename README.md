# Task Manager - React Application

A comprehensive task management application built with React, Vite, and Supabase. This application provides real-time task tracking, work session management, analytics, and user authentication.

## 🚀 Project Overview

This is a full-stack task management system that allows users to:
- **Track tasks** with timer functionality
- **Manage work sessions** with check-in/check-out
- **View analytics** with interactive charts
- **Export data** in multiple formats
- **Theme switching** between light and dark modes
- **Real-time updates** via Supabase subscriptions

## 📁 Project Structure

### Core Files
- **`src/App.jsx`** - Main application component with routing configuration
- **`src/main.jsx`** - Entry point that renders the app
- **`package.json`** - Project dependencies and scripts
- **`vite.config.js`** - Vite bundler configuration

### Authentication System
- **`src/contexts/AuthContext.jsx`** - Authentication context using Supabase Auth
  - Manages user session state
  - Provides login, signup, and logout functions
  - Listens to auth state changes in real-time
  
- **`src/components/ProtectedRoute.jsx`** - Route guard for authenticated routes
- **`src/pages/Login.jsx`** - Login page component
- **`src/pages/Signup.jsx`** - User registration page

### Task Management
- **`src/hooks/useTaskManager.js`** - Core task management logic
  - CRUD operations for tasks
  - Real-time task synchronization with Supabase
  - Timer management (start, stop, restart)
  - Notifications system
  - Task status tracking (idle, running, completed)
  
- **`src/components/TaskList.jsx`** - Displays list of tasks
- **`src/components/TaskCard.jsx`** - Individual task card component
- **`src/components/AddTaskForm.jsx`** - Form to create new tasks
- **`src/components/Stats.jsx`** - Task statistics display

### Work Session Management
- **`src/hooks/useWorkSession.js`** - Work session tracking logic
  - Check-in/check-out functionality
  - Session duration tracking
  - Today's sessions history
  - Total time calculation
  
- **`src/components/WorkSession.jsx`** - Work session UI component
  - Live timer display during active sessions
  - Session history view
  - Check-in/out buttons

### Analytics & Reporting
- **`src/components/Analytics.jsx`** - Analytics dashboard
  - Uses Recharts library for visualizations
  - Task status distribution (Pie Chart)
  - Time per task analysis (Bar Chart)
  - Performance trends (Area Chart)
  - Attempts distribution
  - Summary statistics
  
- **`src/components/ExportMenu.jsx`** - Data export functionality
  - Export to CSV, JSON, or PDF
  - Customizable export options

### UI Components
- **`src/components/Header.jsx`** - Application header
- **`src/components/ThemeToggle.jsx`** - Light/dark theme switcher
- **`src/components/UserMenu.jsx`** & **`UserMenuNew.jsx`** - User profile menu
- **`src/components/Notification.jsx`** - Toast notifications system
- **`src/components/Loader.jsx`** - Loading spinner component

### Database Integration
- **`src/supabaseClient.js`** - Supabase client configuration
  - Connects to Supabase backend
  - Handles authentication and database operations

### Theme System
- **`src/hooks/useTheme.js`** - Theme management hook
  - Persists theme preference
  - Toggles between light and dark modes

### Routing Structure
- **`/`** - Redirects to dashboard
- **`/login`** - Public login page
- **`/signup`** - Public registration page
- **`/dashboard`** - Protected main dashboard (requires authentication)

## 🛠️ Technology Stack

### Frontend
- **React 19.2.0** - UI library
- **React Router DOM 7.13.0** - Client-side routing
- **Recharts 3.7.0** - Data visualization charts
- **Vite 7.2.4** - Build tool and dev server

### Backend & Database
- **Supabase** - Backend as a Service (BaaS)
  - PostgreSQL database
  - Real-time subscriptions
  - Authentication system
  - Row Level Security (RLS)

### Database Schema

#### `tasks` table
- `id` - Primary key (UUID)
- `user_id` - Foreign key to users
- `title` - Task name/title
- `completed` - Boolean completion status
- `elapsed_time` - Total elapsed time in seconds
- `best_time` - Best completion time
- `attempts` - Array of attempt times
- `started_at` - Timestamp when task started
- `created_at` - Creation timestamp

#### `work_sessions` table
- `id` - Primary key
- `user_id` - Foreign key to users
- `check_in` - Check-in timestamp
- `check_out` - Check-out timestamp (null if active)
- `duration` - Session duration in seconds

## ⚙️ How It Works

### 1. **Authentication Flow**
```
User enters credentials → AuthContext validates with Supabase
→ Session stored in state → Protected routes become accessible
→ Real-time auth listener updates user state
```

### 2. **Task Management Flow**
```
User creates task → Saved to Supabase → Real-time update to all clients
→ User starts timer → Local timer + DB update → Timer runs with 1-second intervals
→ User completes task → Elapsed time saved to attempts array → Stats recalculated
```

### 3. **Work Session Flow**
```
User checks in → Session created in DB with check_in time
→ Timer displays elapsed time → User checks out → check_out time recorded
→ Duration calculated and displayed in history
```

### 4. **Real-time Synchronization**
- Supabase subscriptions listen for database changes
- Tasks automatically update across all user sessions
- Work sessions sync in real-time
- No manual refresh needed

### 5. **State Management**
- **Global State**: AuthContext for user authentication
- **Local State**: Component-level state with hooks
- **Server State**: Supabase handles data persistence
- **Real-time State**: WebSocket subscriptions for live updates

## 📊 Key Features

### Task Timer System
- **Start/Stop/Restart** functionality
- **Multiple attempts** tracked per task
- **Best time** calculation automatically
- **Elapsed time** persists across sessions
- **Real-time timer** updates every second

### Work Session Tracking
- **Check-in/Check-out** system
- **Daily session history**
- **Total time today** calculation
- **Active session** indicator
- **Session duration** real-time display

### Analytics Dashboard
- **Task status distribution** (Completed, In Progress, Pending)
- **Time analysis** per task
- **Performance trends** over time
- **Attempts visualization**
- **Summary statistics** (completion rate, avg time, etc.)

### Data Export
- Export tasks to **CSV, JSON, or PDF**
- Includes task details, times, and status
- Downloadable reports for analysis

### Theme System
- **Light and Dark modes**
- **Persistent preference** via localStorage
- **Smooth transitions** between themes

## 🚦 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd task-manger-react
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure Supabase**
   - Update `src/supabaseClient.js` with your Supabase URL and API key
   - Set up database tables (tasks, work_sessions)
   - Configure Row Level Security policies

4. **Run the development server**
```bash
npm run dev
```

5. **Build for production**
```bash
npm run build
```

## 🔒 Security Features

- **Row Level Security (RLS)** - Users can only access their own data
- **Authenticated routes** - Protected by ProtectedRoute component
- **Secure authentication** - Handled by Supabase Auth
- **API key protection** - Server-side validation

## 📱 Responsive Design

- Fully responsive layout
- Mobile-friendly interface
- Touch-optimized interactions
- Adaptive charts and visualizations

## 🔄 Data Flow

```
User Action → React Component → Hook/Context
    ↓
Supabase Client → PostgreSQL Database
    ↓
Real-time Subscription → State Update → UI Re-render
```

## 🎨 UI/UX Features

- **Smooth animations** with CSS transitions
- **Loading states** for better UX
- **Toast notifications** for user feedback
- **Color-coded status** indicators
- **Intuitive navigation** with tabs
- **Badge counters** for active tasks

## 📦 Dependencies

### Production
- `@supabase/supabase-js` - Supabase client library
- `firebase` - Firebase integration (alternative backend)
- `react` & `react-dom` - React framework
- `react-router-dom` - Routing solution
- `recharts` - Charting library

### Development
- `@vitejs/plugin-react` - Vite React plugin
- `eslint` - Code linting
- `vite` - Build tool

## 🚀 Deployment

The application can be deployed to:
- **Vercel** (recommended for Vite apps)
- **Netlify**
- **Firebase Hosting**
- **Any static hosting service**

Configuration included in `vercel.json` for Vercel deployment.

## 📈 Future Enhancements

- Task categories and tags
- Task priority levels
- Collaboration features
- Calendar integration
- Mobile app version
- Advanced filtering and search
- Task templates
- Recurring tasks

## 📄 License

This project is open source and available under the MIT License.
