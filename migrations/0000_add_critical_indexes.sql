-- Foreign key indexes for faster joins
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_images_project_id ON images(project_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_project_id ON processing_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_upload_parts_upload_id ON upload_parts(upload_id);
CREATE INDEX IF NOT EXISTS idx_upload_parts_project_id ON upload_parts(project_id);
CREATE INDEX IF NOT EXISTS idx_multipart_uploads_project_id ON multipart_uploads(project_id);
CREATE INDEX IF NOT EXISTS idx_multipart_uploads_user_id ON multipart_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_project_tags_project_id ON project_tags(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tags_tag_id ON project_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_period ON usage_tracking(user_id, period_start);

-- Status indexes for common queries
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_multipart_uploads_status ON multipart_uploads(status);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_images_project_type ON images(project_id, type);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_project_style ON processing_jobs(project_id, style_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_plan ON user_subscriptions(user_id, plan_id);
