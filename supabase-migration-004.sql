-- Wardrobe App Migration 004: Favorites + indexes

CREATE TABLE favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, item_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own favorites"
  ON favorites FOR ALL
  USING (auth.uid() = user_id);

-- Composite indexes for filter queries
CREATE INDEX IF NOT EXISTS idx_items_category_brand ON items(category, brand);
CREATE INDEX IF NOT EXISTS idx_items_price ON items(purchase_price);