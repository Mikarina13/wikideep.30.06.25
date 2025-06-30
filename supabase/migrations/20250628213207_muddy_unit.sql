/*
  # Fix notifications database support

  1. Security Policies
    - Add missing INSERT policy for user notifications
    - Add missing DELETE policy for user notifications

  2. Stored Procedures
    - Add `mark_all_notifications_as_read` function for bulk operations
    
  3. Indexes
    - Ensure optimal performance for notification queries
*/

-- Add missing RLS policies for user_notifications table
CREATE POLICY "Users can insert notifications" 
  ON user_notifications 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" 
  ON user_notifications 
  FOR DELETE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Create the missing stored procedure for marking all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_notifications 
  SET is_read = true 
  WHERE user_id = auth.uid() AND is_read = false;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION mark_all_notifications_as_read() TO authenticated;

-- Ensure the table has proper indexes for performance (these may already exist but won't error if they do)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c 
    JOIN pg_namespace n ON n.oid = c.relnamespace 
    WHERE c.relname = 'user_notifications_user_id_created_at_idx' 
    AND n.nspname = 'public'
  ) THEN
    CREATE INDEX user_notifications_user_id_created_at_idx 
    ON user_notifications (user_id, created_at DESC);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c 
    JOIN pg_namespace n ON n.oid = c.relnamespace 
    WHERE c.relname = 'user_notifications_user_id_unread_idx' 
    AND n.nspname = 'public'
  ) THEN
    CREATE INDEX user_notifications_user_id_unread_idx 
    ON user_notifications (user_id, is_read) WHERE is_read = false;
  END IF;
END $$;