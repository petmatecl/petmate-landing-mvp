-- Create 'avatars' bucket (public)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Create 'documents' bucket (private)
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Policies for Avatars
-- Drop existing policies if they exist to avoid conflicts (optional but safer for re-runs manually, usually standard migrations just add)
-- For this agent workflow, simple create is fine, assuming clean slate for these specific policies.

create policy "Public Access to Avatars"
on storage.objects for select
to public
using ( bucket_id = 'avatars' );

create policy "Authenticated users can upload avatars"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );

create policy "Users can update own avatars"
on storage.objects for update
to authenticated
using ( bucket_id = 'avatars' and owner = auth.uid() );

create policy "Users can delete own avatars"
on storage.objects for delete
to authenticated
using ( bucket_id = 'avatars' and owner = auth.uid() );

-- Policies for Documents
create policy "Users can upload own documents"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'documents' and auth.role() = 'authenticated' );

create policy "Users can view own documents"
on storage.objects for select
to authenticated
using ( bucket_id = 'documents' and owner = auth.uid() );

create policy "Users can update own documents"
on storage.objects for update
to authenticated
using ( bucket_id = 'documents' and owner = auth.uid() );
