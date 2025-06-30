-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  email text,
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  terms_accepted boolean DEFAULT false,
  terms_accepted_at timestamptz
);

-- Create archive_posts table
CREATE TABLE IF NOT EXISTS archive_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL REFERENCES users(id),
  title text NOT NULL,
  ai_model text NOT NULL,
  prompt text NOT NULL,
  content text NOT NULL,
  tags text[] DEFAULT '{}',
  embed_url text,
  generation_date date,
  prompt_is_public boolean DEFAULT true,
  views integer DEFAULT 0,
  downloads integer DEFAULT 0,
  favorites_count integer DEFAULT 0
);

-- Create collab_posts table  
CREATE TABLE IF NOT EXISTS collab_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL REFERENCES users(id),
  type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  tags text[] DEFAULT '{}',
  contact_email text NOT NULL,
  views integer DEFAULT 0,
  favorites_count integer DEFAULT 0
);

-- Create forum_posts table
CREATE TABLE IF NOT EXISTS forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL REFERENCES users(id),
  post_id uuid,
  post_type text,
  parent_comment_id uuid REFERENCES forum_posts(id),
  content text NOT NULL,
  title text,
  tags text[] DEFAULT '{}'
);

-- Create user_favorites table
CREATE TABLE IF NOT EXISTS user_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL,
  post_type text NOT NULL,
  post_title text NOT NULL,
  post_data jsonb DEFAULT '{}'
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS archive_posts_favorites_count_idx ON archive_posts (favorites_count DESC);
CREATE INDEX IF NOT EXISTS collab_posts_favorites_count_idx ON collab_posts (favorites_count DESC);
CREATE INDEX IF NOT EXISTS forum_posts_parent_idx ON forum_posts (parent_comment_id);
CREATE INDEX IF NOT EXISTS forum_posts_post_id_idx ON forum_posts (post_id, post_type);
CREATE INDEX IF NOT EXISTS forum_posts_tags_idx ON forum_posts USING gin (tags);
CREATE INDEX IF NOT EXISTS forum_posts_user_id_idx ON forum_posts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_favorites_unique_idx ON user_favorites (user_id, post_id, post_type);
CREATE INDEX IF NOT EXISTS user_favorites_user_id_idx ON user_favorites (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS users_terms_accepted_idx ON users (terms_accepted);

-- Add constraints using DO blocks to handle IF NOT EXISTS properly
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

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE collab_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Users policies
DROP POLICY IF EXISTS "Public can read user display information" ON users;
CREATE POLICY "Public can read user display information" ON users
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Users can insert own data" ON users;
CREATE POLICY "Users can insert own data" ON users
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Allow service role to insert users" ON users;
CREATE POLICY "Allow service role to insert users" ON users
  FOR INSERT TO service_role WITH CHECK (true);

-- Archive posts policies
DROP POLICY IF EXISTS "Anyone can read archive posts" ON archive_posts;
CREATE POLICY "Anyone can read archive posts" ON archive_posts
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Authenticated users can create archive posts" ON archive_posts;
CREATE POLICY "Authenticated users can create archive posts" ON archive_posts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own archive posts" ON archive_posts;
CREATE POLICY "Users can update their own archive posts" ON archive_posts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own archive posts" ON archive_posts;
CREATE POLICY "Users can delete their own archive posts" ON archive_posts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Collab posts policies
DROP POLICY IF EXISTS "Anyone can read collab posts" ON collab_posts;
CREATE POLICY "Anyone can read collab posts" ON collab_posts
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Authenticated users can create collab posts" ON collab_posts;
CREATE POLICY "Authenticated users can create collab posts" ON collab_posts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own collab posts" ON collab_posts;
CREATE POLICY "Users can update their own collab posts" ON collab_posts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own collab posts" ON collab_posts;
CREATE POLICY "Users can delete their own collab posts" ON collab_posts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Forum posts policies
DROP POLICY IF EXISTS "Anyone can read forum posts" ON forum_posts;
CREATE POLICY "Anyone can read forum posts" ON forum_posts
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Authenticated users can create forum posts" ON forum_posts;
CREATE POLICY "Authenticated users can create forum posts" ON forum_posts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own forum posts" ON forum_posts;
CREATE POLICY "Users can update their own forum posts" ON forum_posts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own forum posts" ON forum_posts;
CREATE POLICY "Users can delete their own forum posts" ON forum_posts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- User favorites policies
DROP POLICY IF EXISTS "Users can read their own favorites" ON user_favorites;
CREATE POLICY "Users can read their own favorites" ON user_favorites
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add favorites" ON user_favorites;
CREATE POLICY "Users can add favorites" ON user_favorites
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own favorites" ON user_favorites;
CREATE POLICY "Users can delete their own favorites" ON user_favorites
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create function to update favorites count
CREATE OR REPLACE FUNCTION update_favorites_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.post_type = 'archive' THEN
      UPDATE archive_posts 
      SET favorites_count = favorites_count + 1 
      WHERE id = NEW.post_id;
    ELSIF NEW.post_type = 'collab' THEN
      UPDATE collab_posts 
      SET favorites_count = favorites_count + 1 
      WHERE id = NEW.post_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.post_type = 'archive' THEN
      UPDATE archive_posts 
      SET favorites_count = GREATEST(favorites_count - 1, 0)
      WHERE id = OLD.post_id;
    ELSIF OLD.post_type = 'collab' THEN
      UPDATE collab_posts 
      SET favorites_count = GREATEST(favorites_count - 1, 0)
      WHERE id = OLD.post_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to sync user data
CREATE OR REPLACE FUNCTION sync_user_data()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, raw_user_meta_data, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data, NEW.created_at, NEW.updated_at)
  ON CONFLICT (id) 
  DO UPDATE SET
    email = EXCLUDED.email,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = EXCLUDED.updated_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS update_favorites_count_trigger ON user_favorites;
CREATE TRIGGER update_favorites_count_trigger
  AFTER INSERT OR DELETE ON user_favorites
  FOR EACH ROW EXECUTE FUNCTION update_favorites_count();

-- Create trigger on auth.users (if it exists and we have access)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    DROP TRIGGER IF EXISTS sync_user_data_trigger ON auth.users;
    CREATE TRIGGER sync_user_data_trigger
      AFTER INSERT OR UPDATE ON auth.users
      FOR EACH ROW EXECUTE FUNCTION sync_user_data();
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Ignore if we can't create the trigger
END $$;