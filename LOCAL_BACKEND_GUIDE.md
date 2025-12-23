# DeadlineSync - Local Backend without Supabase

## Overview

This document explains the complete local backend system for DeadlineSync that operates **without Supabase**. The system uses SQLite for data storage and provides comprehensive notification integrations including Email, Calendar Sync, Microsoft Teams, and Mobile Push notifications.

## Architecture

### Database: SQLite
- **Storage**: Local SQLite database (`data/deadlines.db`)
- **Advantage**: No external database required, fully offline capable
- **Auto-initialized**: Database and tables created automatically on first request

### Key Components

```
┌─────────────────────────────────────────────────────┐
│                  DeadlineSync App                   │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌──────────────────────────────────────────────┐  │
│  │       Local Backend (No Supabase)            │  │
│  ├──────────────────────────────────────────────┤  │
│  │                                              │  │
│  │  • SQLite Database (Local Storage)           │  │
│  │  • Time Tracking System                      │  │
│  │  • Notification Engine                       │  │
│  │  • Integration Manager                       │  │
│  │                                              │  │
│  └──────────────────────────────────────────────┘  │
│                         │                           │
│          ┌──────────────┼──────────────┐            │
│          │              │              │            │
│    ┌─────▼──────┐ ┌────▼────────┐ ┌──▼─────────┐  │
│    │   Email    │ │  Calendar   │ │   Teams   │  │
│    │   Service  │ │   Service   │ │  Service  │  │
│    │            │ │             │ │           │  │
│    │ • Gmail    │ │ • Google    │ │ • Webhooks│  │
│    │ • Outlook  │ │ • Outlook   │ │           │  │
│    └────────────┘ └─────────────┘ └───────────┘  │
│          │              │              │            │
│    ┌─────▼──────┐ ┌────▼────────┐ ┌──▼─────────┐  │
│    │   Mobile   │ │  Analytics  │ │  Reporting│  │
│    │   Push     │ │   & Stats   │ │           │  │
│    │            │ │             │ │           │  │
│    │ • FCM      │ │ • Insights  │ │ • Export  │  │
│    │ • APNs     │ │ • Trends    │ │           │  │
│    └────────────┘ └─────────────┘ └───────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Database Schema

### 1. Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  notification_preferences TEXT,  -- JSON
  timezone TEXT DEFAULT 'UTC'
);
```

**Purpose**: Store user accounts and preferences
**Fields**:
- `id`: Unique user identifier (UUID)
- `email`: User email for notifications
- `notification_preferences`: JSON object for user notification settings
- `timezone`: User's timezone for deadline calculations

### 2. Deadlines Table
```sql
CREATE TABLE deadlines (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATETIME NOT NULL,
  status TEXT DEFAULT 'pending',  -- pending, in_progress, completed, overdue
  priority TEXT DEFAULT 'medium',  -- low, medium, high, critical
  color TEXT DEFAULT '#ff7f50',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Purpose**: Store all deadline information
**Fields**:
- `title`: Deadline name/title
- `status`: Current state (pending → in_progress → completed or overdue)
- `priority`: Used for notification urgency
- `color`: For UI display
- `completed_at`: Timestamp when deadline was marked complete

### 3. Time Tracking Table
```sql
CREATE TABLE time_tracking (
  id TEXT PRIMARY KEY,
  deadline_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (deadline_id) REFERENCES deadlines(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Purpose**: Track time spent on each deadline
**Features**:
- Automatic duration calculation
- Detailed work sessions
- Analysis of time allocation

### 4. Notifications Table
```sql
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  deadline_id TEXT,
  type TEXT NOT NULL,  -- reminder, completion, urgent, etc.
  channel TEXT NOT NULL,  -- email, teams, calendar, push
  status TEXT DEFAULT 'pending',  -- pending, sent, failed
  recipient TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  scheduled_at DATETIME,
  sent_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (deadline_id) REFERENCES deadlines(id) ON DELETE CASCADE
);
```

**Purpose**: Track all notifications sent to users
**Uses**: Email logs, calendar syncs, Teams messages, push notifications

### 5. Integrations Table
```sql
CREATE TABLE integrations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,  -- gmail, outlook, google_calendar, teams, fcm_push
  config TEXT,  -- JSON with API keys/tokens
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Purpose**: Store third-party service connections
**Types**:
- `gmail`: Gmail SMTP for email notifications
- `outlook`: Outlook SMTP for email notifications
- `google_calendar`: Google Calendar sync
- `outlook_calendar`: Outlook Calendar sync
- `microsoft_teams`: Teams webhook for notifications
- `fcm_push`: Firebase Cloud Messaging for mobile

### 6. Calendar Events Table
```sql
CREATE TABLE calendar_events (
  id TEXT PRIMARY KEY,
  deadline_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  calendar_id TEXT,
  external_event_id TEXT,
  synced_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (deadline_id) REFERENCES deadlines(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Purpose**: Track synced calendar events
**Use**: Prevent duplicate syncing, maintain mapping

## API Routes

### 1. Deadlines Management

#### Get User's Deadlines
```http
GET /api/deadlines-local?userId=user123&status=pending
```

**Response**:
```json
{
  "success": true,
  "deadlines": [
    {
      "id": "deadline-123",
      "user_id": "user123",
      "title": "Project Submission",
      "description": "Submit final project report",
      "due_date": "2025-01-15T23:59:59Z",
      "status": "pending",
      "priority": "high",
      "color": "#ff7f50",
      "created_at": "2025-01-08T10:00:00Z",
      "updated_at": "2025-01-08T10:00:00Z",
      "completed_at": null
    }
  ],
  "count": 1
}
```

#### Create Deadline
```http
POST /api/deadlines-local
Content-Type: application/json

{
  "userId": "user123",
  "title": "Complete Report",
  "description": "Finish quarterly report",
  "dueDate": "2025-01-20T15:00:00Z",
  "priority": "high",
  "color": "#ff7f50"
}
```

**Triggers**:
- Creates deadline record
- Sends "deadline created" notification
- Syncs to calendar if configured
- Logs activity

#### Update Deadline
```http
PUT /api/deadlines-local
Content-Type: application/json

{
  "id": "deadline-123",
  "userId": "user123",
  "status": "completed",
  "title": "Updated Title"
}
```

**When status = "completed"**:
- Records completion timestamp
- Sends completion notification
- Updates time tracking totals
- Awards achievement points
- Sends email/Teams celebration message

#### Delete Deadline
```http
DELETE /api/deadlines-local?id=deadline-123&userId=user123
```

### 2. Time Tracking

#### Get Time Sessions
```http
GET /api/time-tracking?deadlineId=deadline-123&userId=user123
```

**Response**:
```json
{
  "success": true,
  "sessions": [
    {
      "id": "session-456",
      "deadline_id": "deadline-123",
      "user_id": "user123",
      "start_time": "2025-01-08T09:00:00Z",
      "end_time": "2025-01-08T11:30:00Z",
      "duration_minutes": 150,
      "description": "Initial planning and research",
      "created_at": "2025-01-08T11:30:00Z"
    }
  ],
  "totalMinutes": 150,
  "count": 1
}
```

#### Create Time Session
```http
POST /api/time-tracking
Content-Type: application/json

{
  "deadlineId": "deadline-123",
  "userId": "user123",
  "startTime": "2025-01-08T09:00:00Z",
  "endTime": "2025-01-08T11:30:00Z",
  "description": "Working on project"
}
```

**Features**:
- Auto-calculates duration
- Validates end > start
- Tracks work sessions per deadline
- Sends time tracking notifications

#### Update Time Session
```http
PUT /api/time-tracking
Content-Type: application/json

{
  "id": "session-456",
  "userId": "user123",
  "description": "Updated work description"
}
```

#### Delete Time Session
```http
DELETE /api/time-tracking?id=session-456&userId=user123
```

### 3. Notifications

#### Get Notifications
```http
GET /api/notifications-local?userId=user123&deadlineId=deadline-123
```

#### Send Notification
```http
POST /api/notifications-local
Content-Type: application/json

{
  "userId": "user123",
  "deadlineId": "deadline-123",
  "type": "reminder",
  "channels": ["email", "teams", "calendar"],
  "recipient": "user@example.com",
  "subject": "Deadline Reminder",
  "body": "Your deadline is due tomorrow!",
  "scheduledAt": "2025-01-20T08:00:00Z"
}
```

**Channels Supported**:
- `email`: Via Gmail or Outlook SMTP
- `teams`: Via Microsoft Teams webhook
- `calendar`: Sync to Google/Outlook Calendar
- `push`: Mobile push notifications

**Response**:
```json
{
  "success": true,
  "message": "Notification sent successfully",
  "notificationId": "notif-789",
  "channels": {
    "email": true,
    "teams": true,
    "calendar": true,
    "push": false
  }
}
```

#### Update Notification
```http
PUT /api/notifications-local
Content-Type: application/json

{
  "id": "notif-789",
  "userId": "user123",
  "status": "sent"
}
```

### 4. Integrations Management

#### Get User's Integrations
```http
GET /api/integrations?userId=user123
```

**Response**:
```json
{
  "success": true,
  "integrations": [
    {
      "id": "integ-001",
      "user_id": "user123",
      "type": "gmail",
      "config": {
        "email": "user@gmail.com"
      },
      "is_active": 1,
      "created_at": "2025-01-08T10:00:00Z"
    },
    {
      "id": "integ-002",
      "user_id": "user123",
      "type": "microsoft_teams",
      "config": {
        "webhookUrl": "https://outlook.webhook.office.com/..."
      },
      "is_active": 1,
      "created_at": "2025-01-08T10:05:00Z"
    }
  ],
  "count": 2
}
```

#### Connect Integration
```http
POST /api/integrations
Content-Type: application/json

{
  "userId": "user123",
  "type": "gmail",
  "config": {
    "email": "user@gmail.com",
    "password": "app-specific-password"
  },
  "isActive": true
}
```

**Supported Types**:
- `gmail`: Gmail SMTP
- `outlook`: Outlook SMTP
- `google_calendar`: Google Calendar API
- `outlook_calendar`: Microsoft Graph Calendar
- `microsoft_teams`: Teams Webhook
- `fcm_push`: Firebase Cloud Messaging

#### Update Integration
```http
PUT /api/integrations
Content-Type: application/json

{
  "id": "integ-001",
  "userId": "user123",
  "isActive": false
}
```

#### Disconnect Integration
```http
DELETE /api/integrations?id=integ-001&userId=user123
```

## Notification Services

### 1. Email Service (`lib/notifications/email-service.ts`)

**Supported Providers**:
- **Gmail**: Via SMTP
- **Outlook**: Via SMTP-Mail.outlook.com

**Features**:
- HTML email templates
- Reminder notifications
- Completion notifications
- Custom subject/body

**Example**:
```typescript
import emailService from '@/lib/notifications/email-service';

emailService.initialize({
  gmailEmail: process.env.GMAIL_EMAIL,
  gmailPassword: process.env.GMAIL_PASSWORD,
  outlookEmail: process.env.OUTLOOK_EMAIL,
  outlookPassword: process.env.OUTLOOK_PASSWORD,
});

// Send deadline reminder
await emailService.sendDeadlineReminder(
  'user@example.com',
  'Project Report',
  '2025-01-20'
);

// Send completion notification
await emailService.sendCompletionNotification(
  'user@example.com',
  'Project Report'
);
```

### 2. Calendar Service (`lib/notifications/calendar-service.ts`)

**Supported Calendars**:
- **Google Calendar**: Via Google Calendar API
- **Outlook Calendar**: Via Microsoft Graph API

**Features**:
- Auto-sync deadlines to calendar
- Automatic reminders
- Event tracking
- Duplicate prevention

**Example**:
```typescript
import calendarService from '@/lib/notifications/calendar-service';

// Sync to Google Calendar
await calendarService.syncToGoogleCalendar(
  {
    title: 'Project Submission',
    startTime: '2025-01-20T15:00:00Z',
    endTime: '2025-01-20T23:59:59Z',
    reminder: 24 // hours
  },
  'primary'
);

// List events
const events = await calendarService.listGoogleCalendarEvents('primary');
```

### 3. Microsoft Teams Service (`lib/notifications/teams-service.ts`)

**Features**:
- Formatted Adaptive Cards
- Priority-based colors
- Action buttons
- Deep linking to app

**Example**:
```typescript
import teamsService from '@/lib/notifications/teams-service';

teamsService.setWebhookUrl(process.env.TEAMS_WEBHOOK_URL);

// Send deadline alert
await teamsService.sendDeadlineAlert(
  'Project Report',
  '2025-01-20T15:00:00Z',
  'high'
);

// Send completion notification
await teamsService.sendCompletionNotification('Project Report');
```

### 4. Mobile Push Service (`lib/notifications/mobile-push-service.ts`)

**Supported Platforms**:
- **iOS**: Via APNs
- **Android**: Via Firebase Cloud Messaging (FCM)

**Features**:
- Device-specific push
- Rich notifications
- Action handling
- Background sync

**Example**:
```typescript
import mobilePushService from '@/lib/notifications/mobile-push-service';

mobilePushService.setFCMServerKey(process.env.FCM_SERVER_KEY);

// Send reminder
await mobilePushService.sendDeadlineReminder(
  'device-token-123',
  'Project Report',
  '2025-01-20'
);

// Send time tracking alert
await mobilePushService.sendTimeTrackingAlert(
  'device-token-123',
  'Project Report',
  150 // minutes
);
```

## Environment Variables

```env
# Email Services
GMAIL_EMAIL=your-gmail@gmail.com
GMAIL_PASSWORD=your-app-specific-password
OUTLOOK_EMAIL=your-outlook@outlook.com
OUTLOOK_PASSWORD=your-outlook-password

# Calendar Integration
GOOGLE_CALENDAR_API_KEY=your-google-api-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

OUTLOOK_CALENDAR_CLIENT_ID=your-microsoft-client-id
OUTLOOK_CALENDAR_CLIENT_SECRET=your-microsoft-client-secret

# Microsoft Teams
TEAMS_WEBHOOK_URL=https://outlook.webhook.office.com/webhookb2/...

# Firebase Cloud Messaging
FCM_SERVER_KEY=your-fcm-server-key

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Usage Example: Complete Flow

### 1. Create Deadline
```typescript
const response = await fetch('/api/deadlines-local', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',
    title: 'Quarterly Report',
    description: 'Submit Q1 financial report',
    dueDate: '2025-03-31T17:00:00Z',
    priority: 'high'
  })
});
```

### 2. Start Time Tracking
```typescript
const startTime = new Date();

// ... user works on deadline ...

const endTime = new Date();

const response = await fetch('/api/time-tracking', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    deadlineId: 'deadline-123',
    userId: 'user-123',
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    description: 'Q1 financial analysis'
  })
});
```

### 3. Send Notifications
```typescript
const response = await fetch('/api/notifications-local', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',
    deadlineId: 'deadline-123',
    type: 'reminder',
    channels: ['email', 'teams', 'calendar', 'push'],
    recipient: 'user@example.com',
    subject: 'Q1 Report Due Tomorrow',
    body: 'Your quarterly report is due tomorrow at 5 PM',
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  })
});
```

### 4. Complete Deadline
```typescript
const response = await fetch('/api/deadlines-local', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: 'deadline-123',
    userId: 'user-123',
    status: 'completed'
  })
});
// Automatically sends completion notifications across all channels
```

## Benefits of Local Backend

✅ **No External Database Dependency**: SQLite is file-based and self-contained
✅ **Offline Capable**: Core functionality works without internet
✅ **Privacy**: All data stays on your machine/server
✅ **Fast**: Local database queries are near-instantaneous
✅ **Zero Configuration**: Auto-initializes on first run
✅ **Multi-Channel Notifications**: Email, Calendar, Teams, Mobile Push
✅ **Scalable**: Easy to migrate to PostgreSQL if needed
✅ **Time Tracking**: Detailed work session logging
✅ **Comprehensive Integrations**: Connect all major productivity tools

## Data Storage Location

- **Database File**: `data/deadlines.db`
- **Backup**: Recommended to backup this file regularly
- **Migration**: Can be exported/imported as SQLite dump

## Next Steps

1. Update frontend components to use `/api/deadlines-local` instead of `/api/deadlines`
2. Setup environment variables for integrations
3. Configure notification services
4. Build dashboard to display and manage deadlines
5. Implement time tracking UI
6. Add analytics and reporting features
