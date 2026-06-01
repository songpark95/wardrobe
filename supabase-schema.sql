-- Wardrobe App Schema
-- Run this in Supabase SQL Editor after creating your project

-- Items table
CREATE TABLE items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT,
  category TEXT,
  brand TEXT,
  color TEXT,
  material TEXT,
  size TEXT,
  location TEXT,
  notes TEXT,
  condition TEXT,
  purchase_price DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Item photos (supports multiple per item)
CREATE TABLE item_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AI analysis results
CREATE TABLE item_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  photo_id UUID REFERENCES item_photos(id) ON DELETE SET NULL,
  analysis_json JSONB,
  selling_description TEXT,
  draft_listing TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_items_user_id ON items(user_id);
CREATE INDEX idx_items_category ON items(category);
CREATE INDEX idx_items_location ON items(location);
CREATE INDEX idx_item_photos_item_id ON item_photos(item_id);

-- Enable RLS
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_analyses ENABLE ROW LEVEL SECURITY;

-- Policies: users can only see their own items
CREATE POLICY "Users can manage their own items"
  ON items FOR ALL
  USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own photos"
  ON item_photos FOR ALL
  USING (auth.uid() IN (
    SELECT user_id FROM items WHERE id = item_id
  ));
CREATE POLICY "Users can manage their own analyses"
  ON item_analyses FOR ALL
  USING (auth.uid() IN (
    SELECT user_id FROM items WHERE id = item_id
  ));

-- Storage bucket for item photos
-- Run this in Supabase Storage tab: create a bucket called 'item-photos' (public)
INSERT INTO storage.buckets (id, name, public) VALUES ('item-photos', 'item-photos', true)
ON CONFLICT DO NOTHING;

-- Allow authenticated users to upload/read their own photos
CREATE POLICY "Users can upload photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'item-photos' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Anyone can view photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'item-photos');
