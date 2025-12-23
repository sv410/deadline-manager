import { NextResponse } from 'next/server';
import { initializeDatabase, queryAsync, runAsync, getAsync } from '@/lib/db/sqlite';
import { v4 as uuidv4 } from 'uuid';

// Initialize database on startup
initializeDatabase().catch(console.error);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    let query = 'SELECT * FROM deadlines WHERE user_id = ?';
    const params: any[] = [userId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY due_date ASC';

    const deadlines = await queryAsync(query, params);

    return NextResponse.json({
      success: true,
      deadlines,
      count: deadlines.length,
    });
  } catch (error) {
    console.error('Deadline GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deadlines' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const {
      userId,
      title,
      description,
      dueDate,
      priority = 'medium',
      color = '#ff7f50',
    } = await request.json();

    if (!userId || !title || !dueDate) {
      return NextResponse.json(
        { error: 'userId, title, and dueDate are required' },
        { status: 400 }
      );
    }

    const id = uuidv4();

    await runAsync(
      `INSERT INTO deadlines (id, user_id, title, description, due_date, priority, color)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, title, description, dueDate, priority, color]
    );

    const deadline = await getAsync('SELECT * FROM deadlines WHERE id = ?', [id]);

    return NextResponse.json(
      {
        success: true,
        message: 'Deadline created successfully',
        deadline,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Deadline POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create deadline' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const {
      id,
      userId,
      title,
      description,
      dueDate,
      status,
      priority,
      color,
    } = await request.json();

    if (!id || !userId) {
      return NextResponse.json(
        { error: 'id and userId are required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await getAsync(
      'SELECT * FROM deadlines WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!existing) {
      return NextResponse.json(
        { error: 'Deadline not found or unauthorized' },
        { status: 404 }
      );
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (title) {
      updates.push('title = ?');
      params.push(title);
    }
    if (description) {
      updates.push('description = ?');
      params.push(description);
    }
    if (dueDate) {
      updates.push('due_date = ?');
      params.push(dueDate);
    }
    if (status) {
      updates.push('status = ?');
      params.push(status);
      if (status === 'completed') {
        updates.push('completed_at = ?');
        params.push(new Date().toISOString());
      }
    }
    if (priority) {
      updates.push('priority = ?');
      params.push(priority);
    }
    if (color) {
      updates.push('color = ?');
      params.push(color);
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());

    params.push(id);

    if (updates.length > 0) {
      await runAsync(
        `UPDATE deadlines SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    }

    const updated = await getAsync('SELECT * FROM deadlines WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
      message: 'Deadline updated successfully',
      deadline: updated,
    });
  } catch (error) {
    console.error('Deadline PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update deadline' },
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
      'SELECT * FROM deadlines WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!existing) {
      return NextResponse.json(
        { error: 'Deadline not found or unauthorized' },
        { status: 404 }
      );
    }

    await runAsync('DELETE FROM deadlines WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
      message: 'Deadline deleted successfully',
    });
  } catch (error) {
    console.error('Deadline DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete deadline' },
      { status: 500 }
    );
  }
}
