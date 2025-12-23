import nodemailer from 'nodemailer';

interface EmailConfig {
  gmailEmail?: string;
  gmailPassword?: string;
  outlookEmail?: string;
  outlookPassword?: string;
  smtpHost?: string;
  smtpPort?: number;
}

class EmailService {
  private gmailTransporter: any;
  private outlookTransporter: any;

  async initialize(config: EmailConfig) {
    if (config.gmailEmail && config.gmailPassword) {
      this.gmailTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: config.gmailEmail,
          pass: config.gmailPassword,
        },
      });
    }

    if (config.outlookEmail && config.outlookPassword) {
      this.outlookTransporter = nodemailer.createTransport({
        host: 'smtp-mail.outlook.com',
        port: 587,
        secure: false,
        auth: {
          user: config.outlookEmail,
          pass: config.outlookPassword,
        },
      });
    }
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    provider: 'gmail' | 'outlook' = 'gmail'
  ): Promise<boolean> {
    try {
      const transporter = provider === 'gmail' ? this.gmailTransporter : this.outlookTransporter;

      if (!transporter) {
        console.warn(`Email provider ${provider} not configured`);
        return false;
      }

      await transporter.sendMail({
        from: provider === 'gmail' ? process.env.GMAIL_EMAIL : process.env.OUTLOOK_EMAIL,
        to,
        subject,
        html,
      });

      return true;
    } catch (error) {
      console.error('Email sending error:', error);
      return false;
    }
  }

  async sendDeadlineReminder(
    to: string,
    deadlineTitle: string,
    dueDate: string,
    provider: 'gmail' | 'outlook' = 'gmail'
  ): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ff7f50 0%, #ffb347 100%); padding: 20px; border-radius: 8px 8px 0 0; color: white;">
          <h1 style="margin: 0; font-size: 24px;">Deadline Reminder</h1>
        </div>
        <div style="padding: 20px; background: #f9f9f9; border: 1px solid #ddd;">
          <p style="margin: 0 0 10px 0;"><strong>Deadline:</strong> ${deadlineTitle}</p>
          <p style="margin: 0 0 15px 0;"><strong>Due Date:</strong> ${dueDate}</p>
          <p style="margin: 0; color: #666;">This is a reminder that your deadline is coming up. Make sure to complete it on time!</p>
        </div>
        <div style="padding: 15px; background: #fff; text-align: center; border: 1px solid #ddd; border-top: none;">
          <p style="margin: 0; font-size: 12px; color: #999;">DeadlineSync © 2025</p>
        </div>
      </div>
    `;

    return this.sendEmail(to, `Reminder: ${deadlineTitle}`, html, provider);
  }

  async sendCompletionNotification(
    to: string,
    deadlineTitle: string,
    provider: 'gmail' | 'outlook' = 'gmail'
  ): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%); padding: 20px; border-radius: 8px 8px 0 0; color: white;">
          <h1 style="margin: 0; font-size: 24px;">✓ Deadline Completed!</h1>
        </div>
        <div style="padding: 20px; background: #f9f9f9; border: 1px solid #ddd;">
          <p style="margin: 0 0 15px 0;">Great job! You've successfully completed:</p>
          <p style="margin: 0; font-size: 18px; font-weight: bold; color: #22c55e;">${deadlineTitle}</p>
        </div>
        <div style="padding: 15px; background: #fff; text-align: center; border: 1px solid #ddd; border-top: none;">
          <p style="margin: 0; font-size: 12px; color: #999;">Keep up the great work!</p>
        </div>
      </div>
    `;

    return this.sendEmail(to, `✓ ${deadlineTitle} - Completed!`, html, provider);
  }
}

export default new EmailService();
