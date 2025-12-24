-- Add campaigns_config JSONB column to weddings table
ALTER TABLE public.weddings
ADD COLUMN IF NOT EXISTS campaigns_config jsonb DEFAULT '{
  "save_the_date": {
    "status": "draft",
    "enabled": true,
    "hero_image_url": null,
    "welcome_title": "Save The Date!",
    "welcome_text": "Segnati questa data sul calendario!",
    "deadline_date": null
  },
  "rsvp": {
    "status": "draft",
    "enabled": true,
    "hero_image_url": null,
    "welcome_title": "Conferma la tua Presenza",
    "welcome_text": "Non vediamo l''ora di festeggiare con voi!",
    "deadline_date": null
  },
  "theme": {
    "layout_mode": "immersive_scroll",
    "font_family": "serif",
    "primary_color": "#D4AF37",
    "show_countdown": true,
    "show_powered_by": true
  }
}'::jsonb;

-- Create public bucket for RSVP images (hero images must be public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'rsvp-images',
  'rsvp-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for rsvp-images bucket
-- Allow authenticated users to upload images to their wedding folder
CREATE POLICY "Users can upload rsvp images to their wedding folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'rsvp-images' 
  AND (storage.foldername(name))[1] IN (
    SELECT w.id::text FROM weddings w
    INNER JOIN user_roles ur ON ur.wedding_id = w.id
    WHERE ur.user_id = auth.uid()
  )
);

-- Allow authenticated users to update their wedding's images
CREATE POLICY "Users can update their wedding rsvp images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'rsvp-images'
  AND (storage.foldername(name))[1] IN (
    SELECT w.id::text FROM weddings w
    INNER JOIN user_roles ur ON ur.wedding_id = w.id
    WHERE ur.user_id = auth.uid()
  )
);

-- Allow authenticated users to delete their wedding's images
CREATE POLICY "Users can delete their wedding rsvp images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'rsvp-images'
  AND (storage.foldername(name))[1] IN (
    SELECT w.id::text FROM weddings w
    INNER JOIN user_roles ur ON ur.wedding_id = w.id
    WHERE ur.user_id = auth.uid()
  )
);

-- Allow public read access to all rsvp images (guests need to see them)
CREATE POLICY "Anyone can view rsvp images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'rsvp-images');