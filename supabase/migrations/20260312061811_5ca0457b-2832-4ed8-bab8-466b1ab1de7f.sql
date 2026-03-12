
ALTER TABLE public.borrow_records 
ADD COLUMN borrow_photo_url text,
ADD COLUMN return_photo_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('borrow-photos', 'borrow-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'borrow-photos');

CREATE POLICY "Anyone can view borrow photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'borrow-photos');
