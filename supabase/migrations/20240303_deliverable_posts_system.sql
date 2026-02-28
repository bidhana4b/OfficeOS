-- =============================================
-- DELIVERABLE POSTS SYSTEM - Phase 1 Foundation
-- Facebook-like post feed for deliverable tracking
-- =============================================

-- 1. Deliverable Posts (main feed items)
CREATE TABLE IF NOT EXISTS deliverable_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  client_id UUID,
  workspace_id UUID,
  channel_id UUID,
  deliverable_type_id UUID,
  assigned_to UUID,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_progress','internal_review','client_review','revision','approved','delivered','cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  due_date TIMESTAMPTZ,
  revision_count INT NOT NULL DEFAULT 0,
  max_revisions INT NOT NULL DEFAULT 3,
  is_billable BOOLEAN DEFAULT false,
  extra_revision_cost NUMERIC(10,2) DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Post Versions (file versions)
CREATE TABLE IF NOT EXISTS post_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES deliverable_posts(id) ON DELETE CASCADE,
  version_number INT NOT NULL DEFAULT 1,
  file_url TEXT,
  file_type TEXT CHECK (file_type IN ('image','video','pdf','document','audio','other')),
  thumbnail_url TEXT,
  file_name TEXT,
  file_size BIGINT,
  uploaded_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Post Comments (feedback thread)
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES deliverable_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  author_type TEXT NOT NULL DEFAULT 'team' CHECK (author_type IN ('team','client')),
  author_name TEXT,
  author_avatar TEXT,
  content TEXT,
  voice_url TEXT,
  voice_duration INT,
  is_revision_request BOOLEAN DEFAULT false,
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  parent_comment_id UUID REFERENCES post_comments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Comment Attachments
CREATE TABLE IF NOT EXISTS comment_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_name TEXT,
  file_size BIGINT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Post Annotations (image/video annotations)
CREATE TABLE IF NOT EXISTS post_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES deliverable_posts(id) ON DELETE CASCADE,
  version_id UUID REFERENCES post_versions(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  x_position NUMERIC(5,2),
  y_position NUMERIC(5,2),
  width NUMERIC(5,2),
  height NUMERIC(5,2),
  annotation_type TEXT DEFAULT 'pin' CHECK (annotation_type IN ('pin','rectangle','circle','freehand')),
  color TEXT DEFAULT '#FF5733',
  label TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Post Reactions
CREATE TABLE IF NOT EXISTS post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES deliverable_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_type TEXT DEFAULT 'team' CHECK (user_type IN ('team','client')),
  user_name TEXT,
  reaction_type TEXT NOT NULL DEFAULT 'like' CHECK (reaction_type IN ('like','love','celebrate','fire','eyes')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id, reaction_type)
);

-- 7. Approval Log
CREATE TABLE IF NOT EXISTS approval_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES deliverable_posts(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('approved','rejected','revision_requested','status_changed')),
  from_status TEXT,
  to_status TEXT,
  by_user_id UUID NOT NULL,
  by_user_type TEXT DEFAULT 'team' CHECK (by_user_type IN ('team','client')),
  by_user_name TEXT,
  stage TEXT DEFAULT 'client' CHECK (stage IN ('internal','client','final')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_deliverable_posts_tenant ON deliverable_posts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deliverable_posts_client ON deliverable_posts(client_id);
CREATE INDEX IF NOT EXISTS idx_deliverable_posts_assigned ON deliverable_posts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_deliverable_posts_status ON deliverable_posts(status);
CREATE INDEX IF NOT EXISTS idx_deliverable_posts_workspace ON deliverable_posts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_deliverable_posts_channel ON deliverable_posts(channel_id);
CREATE INDEX IF NOT EXISTS idx_post_versions_post ON post_versions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_post ON post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_approval_log_post ON approval_log(post_id);

-- Enable realtime on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE deliverable_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE post_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE post_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE approval_log;

-- Auto-update updated_at on deliverable_posts
CREATE OR REPLACE FUNCTION update_deliverable_post_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_deliverable_post_updated ON deliverable_posts;
CREATE TRIGGER trg_deliverable_post_updated
  BEFORE UPDATE ON deliverable_posts
  FOR EACH ROW EXECUTE FUNCTION update_deliverable_post_timestamp();

-- Auto-update updated_at on post_comments
DROP TRIGGER IF EXISTS trg_post_comment_updated ON post_comments;
CREATE TRIGGER trg_post_comment_updated
  BEFORE UPDATE ON post_comments
  FOR EACH ROW EXECUTE FUNCTION update_deliverable_post_timestamp();
