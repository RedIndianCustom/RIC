/**
 * ============================================================================
 * NOTIFICATION CONTROLLER
 * ============================================================================
 * Handles user notifications for batch coordination and system events
 * ============================================================================
 */

import { supabaseAdmin } from '../config/supabase.js';

/**
 * Get user notifications
 * @route GET /api/notifications
 */
export async function getNotifications(req, res) {
  try {
    const userId = req.user.id;
    const { 
      unread_only = 'false', 
      limit = 50, 
      offset = 0,
      type,
      priority
    } = req.query;

    const { data, error } = await supabaseAdmin
      .rpc('get_user_notifications', {
        p_user_id: userId,
        p_limit: parseInt(limit),
        p_offset: parseInt(offset),
        p_unread_only: unread_only === 'true'
      });

    if (error) throw error;

    // Apply additional filters if provided
    let notifications = data || [];
    
    if (type) {
      notifications = notifications.filter(n => n.type === type);
    }
    
    if (priority) {
      notifications = notifications.filter(n => n.priority === priority);
    }

    // Get unread count
    const { count: unreadCount } = await supabaseAdmin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    return res.json({
      notifications,
      total: notifications.length,
      unread_count: unreadCount || 0,
      limit,
      offset
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Get notification by ID
 * @route GET /api/notifications/:id
 */
export async function getNotificationById(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Notification not found' });
      }
      throw error;
    }

    return res.json({ notification: data });
  } catch (err) {
    console.error('Error fetching notification:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Mark notification as read
 * @route PUT /api/notifications/:id/read
 */
export async function markNotificationRead(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { data, error } = await supabaseAdmin
      .rpc('mark_notification_read', {
        p_notification_id: id,
        p_user_id: userId
      });

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ 
        error: 'Notification not found or already read' 
      });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Mark all notifications as read
 * @route PUT /api/notifications/read-all
 */
export async function markAllNotificationsRead(req, res) {
  try {
    const userId = req.user.id;

    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;

    return res.json({ success: true });
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Delete notification
 * @route DELETE /api/notifications/:id
 */
export async function deleteNotification(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    return res.json({ success: true });
  } catch (err) {
    console.error('Error deleting notification:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Get unread notification count
 * @route GET /api/notifications/unread/count
 */
export async function getUnreadCount(req, res) {
  try {
    const userId = req.user.id;

    const { count, error } = await supabaseAdmin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;

    return res.json({ count: count || 0 });
  } catch (err) {
    console.error('Error fetching unread count:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Create notification (admin/system use)
 * @route POST /api/notifications
 */
export async function createNotification(req, res) {
  try {
    const notificationData = req.body;

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert([notificationData])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ notification: data });
  } catch (err) {
    console.error('Error creating notification:', err);
    return res.status(500).json({ error: err.message });
  }
}

