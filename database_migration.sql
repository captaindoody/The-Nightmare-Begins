-- Run this file once against the existing dooom database.

ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_role_check
            CHECK (role IN ('user', 'manager', 'admin'));
    END IF;
END $$;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_id INTEGER
    REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS tasks_assignee_id_idx ON tasks(assignee_id);

-- Replace the username with the account that should become the first admin.
-- UPDATE users SET role = 'admin' WHERE username = 'your_username';
