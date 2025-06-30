/*
  # Fix archive_posts user relationship

  1. Changes
    - Drop existing foreign key constraint on archive_posts.user_id
    - Add new foreign key constraint referencing auth.users(id) with CASCADE delete
    - This makes it consistent with other tables in the schema
  
  2. Security
    - No changes to RLS policies needed
    - Maintains existing data integrity
*/

-- Drop the existing foreign key constraint
ALTER TABLE public.archive_posts 
DROP CONSTRAINT IF EXISTS archive_posts_user_id_fkey;

-- Add the corrected foreign key constraint referencing auth.users
ALTER TABLE public.archive_posts 
ADD CONSTRAINT archive_posts_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;