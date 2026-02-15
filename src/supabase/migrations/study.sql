-- ===========================================
-- STUDY FEATURE - COMPLETE DATABASE SETUP
-- ===========================================

-- 1. Create student_batch table
CREATE TABLE IF NOT EXISTS student_batch (
    batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_name TEXT NOT NULL UNIQUE
);

-- 2. Create semesters table
CREATE TABLE IF NOT EXISTS semesters (
    semester_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES student_batch(batch_id) ON DELETE CASCADE,
    level INTEGER NOT NULL CHECK (level >= 1 AND level <= 4),
    term INTEGER NOT NULL CHECK (term >= 1 AND term <= 2),
    UNIQUE(batch_id, level, term)
);

-- 3. Create notes table
CREATE TABLE IF NOT EXISTS notes (
    note_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    semester_id UUID NOT NULL REFERENCES semesters(semester_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    course TEXT NOT NULL CHECK (course ~ '^[A-Z]+$'),
    course_code TEXT NOT NULL CHECK (course_code ~ '^[0-9]{1,3}$'),
    file_url TEXT NOT NULL,
    author_id UUID REFERENCES user_info(auth_uid) ON DELETE SET NULL,
    upload_date DATE DEFAULT CURRENT_DATE,
    upload_time TIME DEFAULT CURRENT_TIME
);

-- 4. Create resources table
CREATE TABLE IF NOT EXISTS resources (
    resource_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    semester_id UUID NOT NULL REFERENCES semesters(semester_id) ON DELETE CASCADE,
    author_id UUID REFERENCES user_info(auth_uid) ON DELETE SET NULL,
    title TEXT NOT NULL,
    course TEXT NOT NULL CHECK (course ~ '^[A-Z]+$'),
    course_code TEXT NOT NULL CHECK (course_code ~ '^[0-9]{1,3}$'),
    resource_link TEXT NOT NULL,
    upload_date DATE DEFAULT CURRENT_DATE,
    upload_time TIME DEFAULT CURRENT_TIME
);

-- ===========================================
-- ROW LEVEL SECURITY POLICIES
-- ===========================================

-- Enable RLS on all tables
ALTER TABLE student_batch ENABLE ROW LEVEL SECURITY;
ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- student_batch policies
CREATE POLICY "Allow public read on student_batch" 
    ON student_batch FOR SELECT TO public USING (true);

CREATE POLICY "Allow authenticated insert on student_batch" 
    ON student_batch FOR INSERT TO authenticated WITH CHECK (true);

-- semesters policies
CREATE POLICY "Allow public read on semesters" 
    ON semesters FOR SELECT TO public USING (true);

CREATE POLICY "Allow authenticated insert on semesters" 
    ON semesters FOR INSERT TO authenticated WITH CHECK (true);

-- notes policies
CREATE POLICY "Allow public read on notes" 
    ON notes FOR SELECT TO public USING (true);

CREATE POLICY "Allow authenticated insert on notes" 
    ON notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Allow author to update notes" 
    ON notes FOR UPDATE TO authenticated USING (auth.uid() = author_id);

CREATE POLICY "Allow author to delete notes" 
    ON notes FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- resources policies
CREATE POLICY "Allow public read on resources" 
    ON resources FOR SELECT TO public USING (true);

CREATE POLICY "Allow authenticated insert on resources" 
    ON resources FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Allow author to update resources" 
    ON resources FOR UPDATE TO authenticated USING (auth.uid() = author_id);

CREATE POLICY "Allow author to delete resources" 
    ON resources FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- ===========================================
-- INDEXES FOR BETTER PERFORMANCE
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_semesters_batch ON semesters(batch_id);
CREATE INDEX IF NOT EXISTS idx_semesters_level_term ON semesters(level, term);
CREATE INDEX IF NOT EXISTS idx_notes_semester ON notes(semester_id);
CREATE INDEX IF NOT EXISTS idx_notes_author ON notes(author_id);
CREATE INDEX IF NOT EXISTS idx_resources_semester ON resources(semester_id);
CREATE INDEX IF NOT EXISTS idx_resources_author ON resources(author_id);



Go to Supabase Dashboard → Storage
Click New bucket
Name: notes
Toggle Public bucket to ON
Click Create bucket
Then add storage policies (in Storage → Policies):

-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads" 
    ON storage.objects FOR INSERT TO authenticated 
    WITH CHECK (bucket_id = 'notes');

-- Allow public to read files
CREATE POLICY "Allow public read" 
    ON storage.objects FOR SELECT TO public 
    USING (bucket_id = 'notes');