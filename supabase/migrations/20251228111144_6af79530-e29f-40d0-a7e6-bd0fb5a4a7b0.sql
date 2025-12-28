-- Add slug column to weddings table for personalized RSVP URLs
ALTER TABLE public.weddings 
ADD COLUMN slug text UNIQUE;

-- Create function to generate URL-safe slug from partner names
CREATE OR REPLACE FUNCTION public.generate_wedding_slug(p1_name text, p2_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  -- Create base slug: lowercase, replace spaces with hyphens, remove special chars
  base_slug := lower(
    regexp_replace(
      regexp_replace(
        unaccent(p1_name || '-e-' || p2_name),
        '[^a-zA-Z0-9\-]', '', 'g'
      ),
      '-+', '-', 'g'
    )
  );
  
  -- Remove leading/trailing hyphens
  base_slug := trim(both '-' from base_slug);
  
  -- Check for uniqueness and add counter if needed
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM weddings WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$;

-- Create trigger to auto-generate slug on insert
CREATE OR REPLACE FUNCTION public.auto_generate_wedding_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := generate_wedding_slug(NEW.partner1_name, NEW.partner2_name);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_wedding_slug
BEFORE INSERT ON public.weddings
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_wedding_slug();

-- Enable unaccent extension for removing accents
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Update existing weddings with generated slugs
UPDATE public.weddings 
SET slug = generate_wedding_slug(partner1_name, partner2_name)
WHERE slug IS NULL;