-- STELLAR: Build menu display names with spaces
-- Run this in Supabase Dashboard > SQL Editor AFTER 001-007
--
-- Reverses the earlier "Data_structures_hall" naming (underscore kept,
-- only first letter capitalized) - names should read with spaces instead,
-- matching how they're actually displayed in the Dashboard build menu.
update public.build_menu set name = 'Data structures hall' where id = 'data_structures_hall';
update public.build_menu set name = 'Algorithms tower' where id = 'algorithms_tower';
update public.build_menu set name = 'Interview prep dojo' where id = 'interview_prep_dojo';
update public.build_menu set name = 'Coding coliseum' where id = 'coding_coliseum';
