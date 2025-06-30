/*
  # User Notifications System
  
  1. New Tables
     - `user_notifications` - Stores notifications for users
  
  2. Modifications
     - Added `notification_preferences` column to `users` table
  
  3. Functions
     - Created functions to generate notifications for new posts and followers
     - Added function to mark all notifications as read
  
  4. Triggers
     - Added triggers for automatic notification generation
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  post_id UUID,
  post_type TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS user_notifications_user_id_idx ON user_notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_notifications_is_read_idx ON user_notifications (user_id, is_read);

-- Add check constraint for post_type
ALTER TABLE user_notifications 
  ADD CONSTRAINT user_notifications_post_type_check 
  CHECK (post_type IS NULL OR post_type = ANY (ARRAY['archive'::text, 'collab'::text]));

-- RLS Policies
CREATE POLICY "Users can read their own notifications" 
  ON user_notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can mark their own notifications as read" 
  ON user_notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add notification preference to users table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'notification_preferences'
  ) THEN
    ALTER TABLE users ADD COLUMN notification_preferences JSONB DEFAULT '{"new_post": true, "new_follower": true, "comments": true}'::jsonb;
  END IF;
END $$;

-- Create function to create notifications for new posts from followed users
CREATE OR REPLACE FUNCTION notify_followers_of_new_post()
RETURNS TRIGGER AS $$
DECLARE
  follower_id UUID;
  user_prefs JSONB;
  author_name TEXT;
BEGIN
  -- Get author name
  SELECT COALESCE(
    raw_user_meta_data->>'display_name', 
    raw_user_meta_data->>'full_name', 
    SPLIT_PART(email, '@', 1), 
    'User'
  ) INTO author_name
  FROM users
  WHERE id = NEW.user_id;

  -- For each follower, create a notification if they have enabled post notifications
  FOR follower_id IN 
    SELECT follower_id FROM user_follows WHERE followed_id = NEW.user_id
  LOOP
    -- Check notification preferences
    SELECT notification_preferences INTO user_prefs
    FROM users
    WHERE id = follower_id;
    
    -- Only create notification if new_post preference is enabled or null (default to true)
    IF user_prefs IS NULL OR user_prefs->>'new_post' IS NULL OR (user_prefs->>'new_post')::boolean = true THEN
      INSERT INTO user_notifications (
        user_id,
        sender_id,
        type,
        content,
        post_id,
        post_type
      ) VALUES (
        follower_id,
        NEW.user_id,
        'new_post',
        author_name || ' has published a new ' || TG_ARGV[0] || ' post: "' || NEW.title || '"',
        NEW.id,
        TG_ARGV[0]
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to create notifications for new followers
CREATE OR REPLACE FUNCTION notify_user_of_new_follower()
RETURNS TRIGGER AS $$
DECLARE
  follower_name TEXT;
  user_prefs JSONB;
BEGIN
  -- Get follower name
  SELECT COALESCE(
    raw_user_meta_data->>'display_name', 
    raw_user_meta_data->>'full_name', 
    SPLIT_PART(email, '@', 1), 
    'User'
  ) INTO follower_name
  FROM users
  WHERE id = NEW.follower_id;

  -- Check notification preferences
  SELECT notification_preferences INTO user_prefs
  FROM users
  WHERE id = NEW.followed_id;
  
  -- Only create notification if new_follower preference is enabled or null (default to true)
  IF user_prefs IS NULL OR user_prefs->>'new_follower' IS NULL OR (user_prefs->>'new_follower')::boolean = true THEN
    INSERT INTO user_notifications (
      user_id,
      sender_id,
      type,
      content
    ) VALUES (
      NEW.followed_id,
      NEW.follower_id,
      'new_follower',
      follower_name || ' has started following you'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for notifications
DROP TRIGGER IF EXISTS notify_new_archive_post ON archive_posts;
CREATE TRIGGER notify_new_archive_post
  AFTER INSERT ON archive_posts
  FOR EACH ROW
  EXECUTE FUNCTION notify_followers_of_new_post('archive');

DROP TRIGGER IF EXISTS notify_new_collab_post ON collab_posts;
CREATE TRIGGER notify_new_collab_post
  AFTER INSERT ON collab_posts
  FOR EACH ROW
  EXECUTE FUNCTION notify_followers_of_new_post('collab');

DROP TRIGGER IF EXISTS notify_new_follower ON user_follows;
CREATE TRIGGER notify_new_follower
  AFTER INSERT ON user_follows
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_of_new_follower();

-- Add function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read()
RETURNS void AS $$
BEGIN
  UPDATE user_notifications
  SET is_read = true
  WHERE user_id = auth.uid() AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;