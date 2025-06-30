/*
  # Add user following capability

  1. New Tables
    - `user_follows`
      - `id` (uuid, primary key)
      - `follower_id` (uuid, references auth.users)
      - `followed_id` (uuid, references auth.users)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on `user_follows` table
    - Add policies for viewing, creating and deleting follow relationships
    - Add unique constraint to prevent duplicate follows
*/

-- Create user_follows table to store follow relationships
CREATE TABLE IF NOT EXISTS user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followed_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_follow UNIQUE (follower_id, followed_id)
);

-- Enable Row Level Security
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Create indexes for faster querying
CREATE INDEX IF NOT EXISTS user_follows_follower_idx ON user_follows (follower_id);
CREATE INDEX IF NOT EXISTS user_follows_followed_idx ON user_follows (followed_id);