-- Run this SQL in the Supabase SQL Editor to set up your database tables

-- 1. Create Settings Table
create table if not exists settings (
  id text primary key,
  app_title text,
  login_bg_url text
);

-- 2. Create Users Table
create table if not exists users (
  id text primary key,
  name text,
  role text,
  "accessCode" text,
  "isBanned" boolean default false,
  "isForumBanned" boolean default false,
  "passedExamIds" jsonb default '[]'::jsonb
);

-- 3. Create Exams Table
create table if not exists exams (
  id text primary key,
  title text,
  questions jsonb,
  "timeLimitMinutes" integer,
  "creatorId" text
);

-- 4. Create Results Table
create table if not exists results (
  "examId" text,
  "studentId" text,
  score numeric,
  "maxScore" numeric,
  date timestamp with time zone default now()
);

-- 5. Create Posts Table
create table if not exists posts (
  id text primary key,
  "authorId" text,
  "authorName" text,
  content text,
  "imageUrl" text,
  timestamp bigint
);

-- 6. Create Videos Table
create table if not exists videos (
  id text primary key,
  title text,
  url text,
  "creatorId" text,
  timestamp bigint
);

-- 7. Create Live Sessions Table (NEW)
create table if not exists live_sessions (
  id text primary key,
  is_active boolean default false,
  mode text,
  teacher_id text,
  started_at bigint
);

-- Enable RLS
alter table settings enable row level security;
alter table users enable row level security;
alter table exams enable row level security;
alter table results enable row level security;
alter table posts enable row level security;
alter table videos enable row level security;
alter table live_sessions enable row level security;

-- Policies
create policy "Public Access Settings" on settings for all using (true);
create policy "Public Access Users" on users for all using (true);
create policy "Public Access Exams" on exams for all using (true);
create policy "Public Access Results" on results for all using (true);
create policy "Public Access Posts" on posts for all using (true);
create policy "Public Access Videos" on videos for all using (true);
create policy "Public Access Sessions" on live_sessions for all using (true);
