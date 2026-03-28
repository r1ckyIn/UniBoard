-- Migration: add language preference and translation cache columns

ALTER TABLE profiles
  ADD COLUMN language_preference VARCHAR(5) NOT NULL DEFAULT 'en';

ALTER TABLE courses
  ADD COLUMN name_zh VARCHAR(255);

ALTER TABLE modules
  ADD COLUMN name_zh VARCHAR(255);

ALTER TABLE lessons
  ADD COLUMN title_zh VARCHAR(255);

ALTER TABLE unified_deadlines
  ADD COLUMN title_zh VARCHAR(255);

ALTER TABLE module_items
  ADD COLUMN title_zh VARCHAR(255);
