import axios from 'axios';

interface CalendarEvent {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  reminder?: number; // minutes before
}

interface OutlookEvent {
  subject: string;
  bodyPreview?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
}

class CalendarService {
  private googleAccessToken?: string;
  private outlookAccessToken?: string;

  setGoogleToken(token: string) {
    this.googleAccessToken = token;
  }

  setOutlookToken(token: string) {
    this.outlookAccessToken = token;
  }

  async syncToGoogleCalendar(
    event: CalendarEvent,
    calendarId: string = 'primary'
  ): Promise<boolean> {
    if (!this.googleAccessToken) {
      console.warn('Google Calendar not configured');
      return false;
    }

    try {
      await axios.post(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
        {
          summary: event.title,
          description: event.description,
          start: {
            dateTime: event.startTime,
            timeZone: 'UTC',
          },
          end: {
            dateTime: event.endTime,
            timeZone: 'UTC',
          },
          reminders: {
            useDefault: false,
            overrides: event.reminder ? [{ method: 'notification', minutes: event.reminder }] : [],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.googleAccessToken}`,
          },
        }
      );

      return true;
    } catch (error) {
      console.error('Google Calendar sync error:', error);
      return false;
    }
  }

  async syncToOutlookCalendar(event: CalendarEvent): Promise<boolean> {
    if (!this.outlookAccessToken) {
      console.warn('Outlook Calendar not configured');
      return false;
    }

    try {
      await axios.post(
        'https://graph.microsoft.com/v1.0/me/events',
        {
          subject: event.title,
          bodyPreview: event.description,
          start: {
            dateTime: event.startTime,
            timeZone: 'UTC',
          },
          end: {
            dateTime: event.endTime,
            timeZone: 'UTC',
          },
          reminder: event.reminder || 15,
          isReminderOn: true,
        },
        {
          headers: {
            Authorization: `Bearer ${this.outlookAccessToken}`,
          },
        }
      );

      return true;
    } catch (error) {
      console.error('Outlook Calendar sync error:', error);
      return false;
    }
  }

  async listGoogleCalendarEvents(calendarId: string = 'primary'): Promise<any[]> {
    if (!this.googleAccessToken) {
      return [];
    }

    try {
      const response = await axios.get(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
        {
          headers: {
            Authorization: `Bearer ${this.googleAccessToken}`,
          },
        }
      );

      return response.data.items || [];
    } catch (error) {
      console.error('Google Calendar list error:', error);
      return [];
    }
  }

  async listOutlookCalendarEvents(): Promise<OutlookEvent[]> {
    if (!this.outlookAccessToken) {
      return [];
    }

    try {
      const response = await axios.get('https://graph.microsoft.com/v1.0/me/events', {
        headers: {
          Authorization: `Bearer ${this.outlookAccessToken}`,
        },
      });

      return response.data.value || [];
    } catch (error) {
      console.error('Outlook Calendar list error:', error);
      return [];
    }
  }
}

export default new CalendarService();
