import { NextResponse } from 'next/server';
import { queryAsync, runAsync, getAsync } from '@/lib/db/sqlite';
import { v4 as uuidv4 } from 'uuid';
import emailService from '@/lib/notifications/email-service';

// Initialize email service with environment variables
const initEmailService = () => {
  emailService.initialize({
    gmailEmail: process.env.GMAIL_EMAIL,
    gmailPassword: process.env.GMAIL_PASSWORD,
    outlookEmail: process.env.OUTLOOK_EMAIL,
    outlookPassword: process.env.OUTLOOK_PASSWORD,
  });
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const integrations = await queryAsync(
      `SELECT * FROM integrations WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );

    return NextResponse.json({
      success: true,
      integrations,
      count: integrations.length,
    });
  } catch (error) {
    console.error('Integrations GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch integrations' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId, type, config, isActive = true } = await request.json();

    if (!userId || !type) {
      return NextResponse.json(
        { error: 'userId and type are required' },
        { status: 400 }
      );
    }

    const validTypes = [
      'gmail',
      'outlook',
      'google_calendar',
      'outlook_calendar',
      'microsoft_teams',
      'fcm_push',
    ];

    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid integration type. Allowed: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const id = uuidv4();

    // Store the configuration (encrypted in production)
    const configString = JSON.stringify(config || {});

    await runAsync(
      `INSERT INTO integrations (id, user_id, type, config, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [id, userId, type, configString, isActive ? 1 : 0]
    );

    // If Gmail or Outlook, initialize email service
    if ((type === 'gmail' || type === 'outlook') && config) {
      initEmailService();
    }

    const integration = await getAsync(
      'SELECT * FROM integrations WHERE id = ?',
      [id]
    );

    return NextResponse.json(
      {
        success: true,
        message: `${type} integration connected successfully`,
        integration: {
          ...integration,
          config: JSON.parse(integration.config),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Integrations POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create integration' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { id, userId, config, isActive } = await request.json();

    if (!id || !userId) {
      return NextResponse.json(
        { error: 'id and userId are required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await getAsync(
      'SELECT * FROM integrations WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!existing) {
      return NextResponse.json(
        { error: 'Integration not found or unauthorized' },
        { status: 404 }
      );
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (config) {
      updates.push('config = ?');
      params.push(JSON.stringify(config));
    }

    if (isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(isActive ? 1 : 0);
    }

    params.push(id);

    if (updates.length > 0) {
      await runAsync(
        `UPDATE integrations SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    }

    const updated = await getAsync('SELECT * FROM integrations WHERE id = ?', [
      id,
    ]);

    return NextResponse.json({
      success: true,
      message: 'Integration updated successfully',
      integration: {
        ...updated,
        config: JSON.parse(updated.config),
      },
    });
  } catch (error) {
    console.error('Integrations PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update integration' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id || !userId) {
      return NextResponse.json(
        { error: 'id and userId are required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await getAsync(
      'SELECT * FROM integrations WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!existing) {
      return NextResponse.json(
        { error: 'Integration not found or unauthorized' },
        { status: 404 }
      );
    }

    await runAsync('DELETE FROM integrations WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
      message: 'Integration disconnected successfully',
    });
  } catch (error) {
    console.error('Integrations DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete integration' },
      { status: 500 }
    );
  }
}
