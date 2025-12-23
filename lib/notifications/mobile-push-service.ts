import axios from 'axios';

interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  actions?: Array<{ action: string; title: string }>;
}

class MobilePushService {
  private fcmServerKey?: string;

  setFCMServerKey(key: string) {
    this.fcmServerKey = key;
  }

  async sendToDevice(
    deviceToken: string,
    payload: PushNotificationPayload
  ): Promise<boolean> {
    if (!this.fcmServerKey) {
      console.warn('FCM Server Key not configured');
      return false;
    }

    try {
      await axios.post(
        'https://fcm.googleapis.com/fcm/send',
        {
          to: deviceToken,
          notification: {
            title: payload.title,
            body: payload.body,
            icon: payload.icon || '/icon.svg',
            badge: payload.badge || '/icon.svg',
            tag: payload.tag,
          },
          data: {
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
            id: payload.tag || '1',
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `key=${this.fcmServerKey}`,
          },
        }
      );

      return true;
    } catch (error) {
      console.error('FCM push notification error:', error);
      return false;
    }
  }

  async sendDeadlineReminder(
    deviceToken: string,
    title: string,
    dueDate: string
  ): Promise<boolean> {
    return this.sendToDevice(deviceToken, {
      title: '⏰ Deadline Reminder',
      body: `${title} is due on ${dueDate}`,
      tag: 'deadline-reminder',
    });
  }

  async sendCompletionNotification(
    deviceToken: string,
    title: string
  ): Promise<boolean> {
    return this.sendToDevice(deviceToken, {
      title: '✓ Deadline Completed!',
      body: `You have completed: ${title}`,
      tag: 'deadline-completed',
    });
  }

  async sendTimeTrackingAlert(
    deviceToken: string,
    title: string,
    duration: number
  ): Promise<boolean> {
    return this.sendToDevice(deviceToken, {
      title: '⏱️ Time Tracking',
      body: `You spent ${duration} minutes on ${title}`,
      tag: 'time-tracking',
    });
  }
}

export default new MobilePushService();
