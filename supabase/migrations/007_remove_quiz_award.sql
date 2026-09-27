-- STELLAR: Remove the separate quiz-pass reward
-- Run this in Supabase Dashboard > SQL Editor AFTER 001-006
--
-- Per request: quizzes no longer grant their own separate XP/coins bonus
-- on top of the lesson's reward - only the lesson's own
-- xp_reward/coins_reward/material (already granted via
-- award_lesson_complete when the quiz is passed) applies. This drops the
-- now-unused award_quiz_pass() RPC; the client no longer calls it, and
-- nothing else in the schema references it.
drop function if exists public.award_quiz_pass(uuid, uuid);
