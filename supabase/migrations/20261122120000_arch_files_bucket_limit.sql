-- arch schema, part 7: room for big models. The private bucket "arch-files" takes files up to 1 GB (it took 50 MB).
-- Revit models are often 50 to 500 MB. The page sends anything over 6 MB in resumable 6 MB parts.
-- Additive only. Safe to run twice. Nothing is dropped, and no file is touched.
--
-- THIS FILE TOUCHES ONE THING OUTSIDE THE arch SCHEMA: the row for "arch-files" in storage.buckets.
-- It stays private. If part 6 has not been applied yet, the bucket is made here, private, with the new limit; part 6
-- then leaves the limit alone (it only makes sure the bucket is private).
--
-- Supabase also has a limit for the whole project (Project Settings, then Storage, "Upload file size limit"). A bucket
-- cannot take more than that, so it must be set to at least 1 GB as well. That is a setting, not part of this file.
insert into storage.buckets (id, name, public, file_size_limit)
values ('arch-files', 'arch-files', false, 1073741824)   -- 1 GB a file
on conflict (id) do update set file_size_limit = 1073741824, public = false;
