/*
  # Fix ambiguous follower_id column reference

  1. Problem
    - Notification trigger function has ambiguous column references
    - Inconsistent foreign key relationships between users and auth.users tables
    - Function variables conflict with column names in joins

  2. Solution
    - Fix foreign key relationships to be consistent
    - Update notification functions to use proper table aliases
    - Ensure all user references point to the same table structure

  3. Changes
    - Update user_follows table to reference users(id) consistently
    - Fix notification trigger functions with proper aliases
    - Add missing foreign key constraint for user_favorites
*/

-- First, ensure the users table has the correct foreign key setup
-- Make sure user_follows references the users table consistently
ALTER TABLE user_follows 
DROP CONSTRAINT IF EXISTS user_follows_follower_id_fkey;

ALTER TABLE user_follows 
DROP CONSTRAINT IF EXISTS user_follows_followed_id_fkey;

ALTER TABLE user_follows 
ADD CONSTRAINT user_follows_follower_id_fkey 
FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_follows 
ADD CONSTRAINT user_follows_followed_id_fkey 
FOREIGN KEY (followed_id) REFERENCES users(id) ON DELETE CASCADE;

-- Ensure user_favorites also references users table consistently
ALTER TABLE user_favorites 
DROP CONSTRAINT IF EXISTS user_favorites_user_id_fkey;

ALTER TABLE user_favorites 
ADD CONSTRAINT user_favorites_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Fix the notification function to avoid ambiguous column references
CREATE OR REPLACE FUNCTION notify_followers_of_new_post(post_type_arg text)
RETURNS TRIGGER AS $$
DECLARE
  follower_user_id UUID;
  user_prefs JSONB;
  author_name TEXT;
BEGIN
  -- Get author name from users table
  SELECT COALESCE(
    u.raw_user_meta_data->>'display_name', 
    u.raw_user_meta_data->>'full_name', 
    SPLIT_PART(u.email, '@', 1), 
    'User'
  ) INTO author_name
  FROM users u
  WHERE u.id = NEW.user_id;

  -- For each follower, create a notification if they have enabled post notifications
  FOR follower_user_id IN 
    SELECT uf.follower_id 
    FROM user_follows uf 
    WHERE uf.followed_id = NEW.user_id
  LOOP
    -- Check notification preferences
    SELECT u.notification_preferences INTO user_prefs
    FROM users u
    WHERE u.id = follower_user_id;
    
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
        follower_user_id,
        NEW.user_id,
        'new_post',
        author_name || ' has published a new ' || post_type_arg || ' post: "' || NEW.title || '"',
        NEW.id,
        post_type_arg
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix the new follower notification function as well
CREATE OR REPLACE FUNCTION notify_user_of_new_follower()
RETURNS TRIGGER AS $$
DECLARE
  follower_name TEXT;
  user_prefs JSONB;
BEGIN
  -- Get follower name with proper table alias
  SELECT COALESCE(
    u.raw_user_meta_data->>'display_name', 
    u.raw_user_meta_data->>'full_name', 
    SPLIT_PART(u.email, '@', 1), 
    'User'
  ) INTO follower_name
  FROM users u
  WHERE u.id = NEW.follower_id;

  -- Check notification preferences with proper table alias
  SELECT u.notification_preferences INTO user_prefs
  FROM users u
  WHERE u.id = NEW.followed_id;
  
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

-- Recreate the triggers with the corrected functions
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

-- Ensure user_notifications references the correct user table
ALTER TABLE user_notifications 
DROP CONSTRAINT IF EXISTS user_notifications_user_id_fkey;

ALTER TABLE user_notifications 
DROP CONSTRAINT IF EXISTS user_notifications_sender_id_fkey;

ALTER TABLE user_notifications 
ADD CONSTRAINT user_notifications_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_notifications 
ADD CONSTRAINT user_notifications_sender_id_fkey 
FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL;