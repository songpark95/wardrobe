-- Wardrobe App Migration 003: Outfit Builder

CREATE TABLE outfits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT,
  occasion TEXT,
  date DATE,
  mood TEXT,
  palette JSONB,
  notes TEXT,
  collage_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE outfit_items (
  outfit_id UUID NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  position INT DEFAULT 0,
  PRIMARY KEY (outfit_id, item_id)
);

CREATE INDEX idx_outfits_user ON outfits(user_id);
CREATE INDEX idx_outfit_items_outfit ON outfit_items(outfit_id);
CREATE INDEX idx_outfit_items_item ON outfit_items(item_id);

ALTER TABLE outfits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own outfits"
  ON outfits FOR ALL
  USING (auth.uid() = user_id);

ALTER TABLE outfit_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their outfit items"
  ON outfit_items FOR ALL
  USING (auth.uid() IN (
    SELECT user_id FROM outfits WHERE id = outfit_id
  ));