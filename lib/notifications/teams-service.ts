import axios from 'axios';

interface TeamsMessage {
  title: string;
  description?: string;
  deadline?: string;
  priority: 'high' | 'medium' | 'low';
}

class TeamsService {
  private webhookUrl?: string;

  setWebhookUrl(url: string) {
    this.webhookUrl = url;
  }

  async sendNotification(message: TeamsMessage): Promise<boolean> {
    if (!this.webhookUrl) {
      console.warn('Microsoft Teams webhook not configured');
      return false;
    }

    try {
      const themeColor = {
        high: 'ff3333',
        medium: 'ffb347',
        low: '4ade80',
      }[message.priority];

      const payload = {
        @type: 'MessageCard',
        @context: 'https://schema.org/extensions',
        summary: message.title,
        themeColor: themeColor,
        sections: [
          {
            activityTitle: message.title,
            activitySubtitle: `Priority: ${message.priority.toUpperCase()}`,
            text: message.description || 'No description provided',
            facts: message.deadline
              ? [
                  {
                    name: 'Due Date:',
                    value: message.deadline,
                  },
                ]
              : [],
          },
        ],
        potentialAction: [
          {
            @type: 'OpenUri',
            name: 'View in DeadlineSync',
            targets: [
              {
                os: 'default',
                uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
              },
            ],
          },
        ],
      };

      await axios.post(this.webhookUrl, payload);
      return true;
    } catch (error) {
      console.error('Teams notification error:', error);
      return false;
    }
  }

  async sendDeadlineAlert(
    title: string,
    dueDate: string,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<boolean> {
    return this.sendNotification({
      title: `⏰ Deadline Alert: ${title}`,
      description: `This deadline requires your attention!`,
      deadline: dueDate,
      priority,
    });
  }

  async sendCompletionNotification(title: string): Promise<boolean> {
    return this.sendNotification({
      title: `✓ Deadline Completed: ${title}`,
      description: 'Great job! You have successfully completed this deadline.',
      priority: 'high',
    });
  }
}

export default new TeamsService();
