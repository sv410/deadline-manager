import { NextResponse } from 'next/server';
import { queryAsync, runAsync, getAsync } from '@/lib/db/sqlite';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deadlineId = searchParams.get('deadlineId');
    const userId = searchParams.get('userId');

    if (!deadlineId || !userId) {
      return NextResponse.json(
        { error: 'deadlineId and userId are required' },
        { status: 400 }
      );
    }

    const sessions = await queryAsync(
      `SELECT * FROM time_tracking 
       WHERE deadline_id = ? AND user_id = ? 
       ORDER BY start_time DESC`,
      [deadlineId, userId]
    );

    const totalMinutes = sessions.reduce(
      (sum: number, session: any) => sum + session.duration_minutes,
      0
    );

    return NextResponse.json({
      success: true,
      sessions,
      totalMinutes,
      count: sessions.length,
    });
  } catch (error) {
    console.error('Time tracking GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch time tracking data' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const {
      deadlineId,
      userId,
      startTime,
      endTime,
      description,
    } = await request.json();

    if (!deadlineId || !userId || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'deadlineId, userId, startTime, and endTime are required' },
        { status: 400 }
      );
    }

    // Calculate duration
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const durationMinutes = Math.round((end - start) / 1000 / 60);

    if (durationMinutes < 0) {
      return NextResponse.json(
        { error: 'endTime must be after startTime' },
        { status: 400 }
      );
    }

    const id = uuidv4();

    await runAsync(
      `INSERT INTO time_tracking 
       (id, deadline_id, user_id, start_time, end_time, duration_minutes, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, deadlineId, userId, startTime, endTime, durationMinutes, description]
    );

    const session = await getAsync('SELECT * FROM time_tracking WHERE id = ?', [
      id,
    ]);

    return NextResponse.json(
      {
        success: true,
        message: 'Time tracking session created',
        session,
        durationMinutes,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Time tracking POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create time tracking session' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { id, userId, description } = await request.json();

    if (!id || !userId) {
      return NextResponse.json(
        { error: 'id and userId are required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await getAsync(
      'SELECT * FROM time_tracking WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!existing) {
      return NextResponse.json(
        { error: 'Time tracking session not found or unauthorized' },
        { status: 404 }
      );
    }

    if (description) {
      await runAsync('UPDATE time_tracking SET description = ? WHERE id = ?', [
        description,
        id,
      ]);
    }

    const updated = await getAsync('SELECT * FROM time_tracking WHERE id = ?', [
      id,
    ]);

    return NextResponse.json({
      success: true,
      message: 'Time tracking session updated',
      session: updated,
    });
  } catch (error) {
    console.error('Time tracking PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update time tracking session' },
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
      'SELECT * FROM time_tracking WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!existing) {
      return NextResponse.json(
        { error: 'Time tracking session not found or unauthorized' },
        { status: 404 }
      );
    }

    await runAsync('DELETE FROM time_tracking WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
      message: 'Time tracking session deleted',
    });
  } catch (error) {
    console.error('Time tracking DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete time tracking session' },
      { status: 500 }
    );
  }
}
