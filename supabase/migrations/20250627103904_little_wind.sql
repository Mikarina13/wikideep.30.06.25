/*
  # Fix constraint syntax errors
  
  1. Changes
    - Fix incorrect "IF NOT EXISTS" syntax with constraints
    - Use DO blocks to safely check for existing constraints
    - Properly handle constraint creation
  2. Security
    - Maintain all existing security policies
*/

-- Add constraints safely using DO blocks for forum_posts table
DO $$
BEGIN
  -- Add forum_posts_post_type_check constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'forum_posts_post_type_check' 
    AND table_name = 'forum_posts'
  ) THEN
    ALTER TABLE forum_posts ADD CONSTRAINT forum_posts_post_type_check 
      CHECK (post_type IS NULL OR post_type = ANY (ARRAY['archive'::text, 'collab'::text]));
  END IF;
END $$;

-- Add constraints safely using DO blocks for user_favorites table
DO $$
BEGIN
  -- Add user_favorites_post_type_check constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_favorites_post_type_check' 
    AND table_name = 'user_favorites'
  ) THEN
    ALTER TABLE user_favorites ADD CONSTRAINT user_favorites_post_type_check 
      CHECK (post_type = ANY (ARRAY['archive'::text, 'collab'::text]));
  END IF;

  -- Add unique constraint on user_favorites if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_favorites_unique' 
    AND table_name = 'user_favorites'
  ) THEN
    ALTER TABLE user_favorites ADD CONSTRAINT user_favorites_unique 
      UNIQUE (user_id, post_id, post_type);
  END IF;
END $$;