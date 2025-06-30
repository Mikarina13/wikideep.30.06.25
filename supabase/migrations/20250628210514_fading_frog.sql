/*
  # Fix User Follows Table and Constraints

  1. New Tables
    - `user_follows`
      - `id` (uuid, primary key)
      - `follower_id` (uuid, references auth.users)
      - `followed_id` (uuid, references auth.users)
      - `created_at` (timestamptz)
  2. Security
    - Enable RLS on `user_follows` table
    - Add policies for authenticated users to see their follows
*/

-- First check if table already exists
CREATE TABLE IF NOT EXISTS user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL,
  followed_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_follow UNIQUE (follower_id, followed_id)
);

-- Add foreign key constraints using DO block to check existence first
DO $$ 
BEGIN
  -- Add follower_id foreign key if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'user_follows_follower_id_fkey'
  ) THEN
    ALTER TABLE user_follows
    ADD CONSTRAINT user_follows_follower_id_fkey
    FOREIGN KEY (follower_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Add followed_id foreign key if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'user_follows_followed_id_fkey'
  ) THEN
    ALTER TABLE user_follows
    ADD CONSTRAINT user_follows_followed_id_fkey
    FOREIGN KEY (followed_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid duplication
DROP POLICY IF EXISTS "Users can see who they follow" ON user_follows;
DROP POLICY IF EXISTS "Users can see who follows them" ON user_follows;
DROP POLICY IF EXISTS "Users can follow other users" ON user_follows;
DROP POLICY IF EXISTS "Users can unfollow users they follow" ON user_follows;

-- Re-create RLS Policies
CREATE POLICY "Users can see who they follow" 
  ON user_follows
  FOR SELECT
  TO authenticated
  USING (follower_id = auth.uid());

CREATE POLICY "Users can see who follows them" 
  ON user_follows
  FOR SELECT
  TO authenticated
  USING (followed_id = auth.uid());

CREATE POLICY "Users can follow other users" 
  ON user_follows
  FOR INSERT
  TO authenticated
  WITH CHECK (follower_id = auth.uid());

CREATE POLICY "Users can unfollow users they follow" 
  ON user_follows
  FOR DELETE
  TO authenticated
  USING (follower_id = auth.uid());

-- Create indexes for faster querying if they don't exist
CREATE INDEX IF NOT EXISTS user_follows_follower_idx ON user_follows (follower_id);
CREATE INDEX IF NOT EXISTS user_follows_followed_idx ON user_follows (followed_id);