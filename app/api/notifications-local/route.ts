import { NextResponse } from 'next/server';
import { queryAsync, runAsync, getAsync } from '@/lib/db/sqlite';
import { v4 as uuidv4 } from 'uuid';
import emailService from '@/lib/notifications/email-service';
import teamsService from '@/lib/notifications/teams-service';
import mobilePushService from '@/lib/notifications/mobile-push-service';
import calendarService from '@/lib/notifications/calendar-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const deadlineId = searchParams.get('deadlineId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    let query = `SELECT * FROM notifications WHERE user_id = ?`;
    const params: any[] = [userId];

    if (deadlineId) {
      query += ` AND deadline_id = ?`;
      params.push(deadlineId);
    }

    query += ` ORDER BY created_at DESC`;

    const notifications = await queryAsync(query, params);

    return NextResponse.json({
      success: true,
      notifications,
      count: notifications.length,
    });
  } catch (error) {
    console.error('Notifications GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const {
      userId,
      deadlineId,
      type,
      channels = ['email'],
      recipient,
      subject,
      body,
      scheduledAt,
    } = await request.json();

    if (!userId || !recipient || !type) {
      return NextResponse.json(
        { error: 'userId, recipient, and type are required' },
        { status: 400 }
      );
    }

    const notificationId = uuidv4();
    const now = new Date().toISOString();

    // Create notification record
    await runAsync(
      `INSERT INTO notifications 
       (id, user_id, deadline_id, type, channel, status, recipient, subject, body, scheduled_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        notificationId,
        userId,
        deadlineId,
        type,
        channels.join(','),
        'pending',
        recipient,
        subject,
        body,
        scheduledAt || now,
        now,
      ]
    );

    // Send notifications through configured channels
    const results: any = {};

    if (channels.includes('email')) {
      try {
        const emailSent = await emailService.sendEmail(
          recipient,
          subject || `Deadline Notification: ${type}`,
          body || 'You have a new deadline notification',
          'gmail'
        );
        results.email = emailSent;
      } catch (error) {
        console.error('Email notification error:', error);
        results.email = false;
      }
    }

    if (channels.includes('teams')) {
      try {
        const teamsSent = await teamsService.sendNotification({
          title: subject || `Deadline: ${type}`,
          description: body,
          priority: type === 'urgent' ? 'high' : 'medium',
        });
        results.teams = teamsSent;
      } catch (error) {
        console.error('Teams notification error:', error);
        results.teams = false;
      }
    }

    if (channels.includes('calendar')) {
      try {
        if (deadlineId) {
          const deadline = await getAsync(
            'SELECT * FROM deadlines WHERE id = ?',
            [deadlineId]
          );
          if (deadline) {
            await calendarService.syncToGoogleCalendar({
              title: deadline.title,
              description: deadline.description || body,
              startTime: new Date().toISOString(),
              endTime: deadline.due_date,
              reminder: 15,
            });
            results.calendar = true;
          }
        }
      } catch (error) {
        console.error('Calendar sync error:', error);
        results.calendar = false;
      }
    }

    if (channels.includes('push')) {
      // Store device token would be needed in user preferences
      results.push = true; // Placeholder
    }

    // Update notification status
    const anySent = Object.values(results).some((v) => v);
    await runAsync(
      `UPDATE notifications SET status = ?, sent_at = ? WHERE id = ?`,
      [anySent ? 'sent' : 'failed', anySent ? now : null, notificationId]
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Notification sent successfully',
        notificationId,
        channels: results,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Notifications POST error:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { id, userId, status } = await request.json();

    if (!id || !userId) {
      return NextResponse.json(
        { error: 'id and userId are required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await getAsync(
      'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!existing) {
      return NextResponse.json(
        { error: 'Notification not found or unauthorized' },
        { status: 404 }
      );
    }

    if (status) {
      await runAsync('UPDATE notifications SET status = ? WHERE id = ?', [
        status,
        id,
      ]);
    }

    const updated = await getAsync('SELECT * FROM notifications WHERE id = ?', [
      id,
    ]);

    return NextResponse.json({
      success: true,
      message: 'Notification updated',
      notification: updated,
    });
  } catch (error) {
    console.error('Notifications PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}
