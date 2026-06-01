-- Wardrobe App Migration 002: Brands, Categories, Price Modifier

-- ========================================
-- BRANDS (multi-brand support via junction)
-- ========================================
CREATE TABLE brands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE item_brands (
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, brand_id)
);

CREATE INDEX idx_item_brands_item ON item_brands(item_id);
CREATE INDEX idx_item_brands_brand ON item_brands(brand_id);

ALTER TABLE item_brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage item_brands"
  ON item_brands FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM items WHERE id = item_id));

-- ========================================
-- CATEGORIES (defaults + user additions)
-- ========================================
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_default BOOLEAN DEFAULT false,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO categories (name, is_default) VALUES
  ('Tops', true),
  ('Bottoms', true),
  ('Outerwear', true),
  ('Footwear', true),
  ('Accessories', true),
  ('Headwear', true),
  ('Bags', true),
  ('Jewelry', true),
  ('Tailoring', true),
  ('Denim', true),
  ('Loungewear', true),
  ('Sweaters', true),
  ('Shirting', true),
  ('Jackets', true),
  ('Coats', true),
  ('Suits', true);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all categories"
  ON categories FOR SELECT
  USING (true);
CREATE POLICY "Users can add categories"
  ON categories FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    (user_id IS NULL AND is_default = false)
  );

-- ========================================
-- ADD price_modifier to items (purchase_price already exists)
-- ========================================
ALTER TABLE items ADD COLUMN IF NOT EXISTS price_modifier TEXT;

-- Migrate existing brand data into brands table (if any)
INSERT INTO brands (name)
SELECT DISTINCT TRIM(brand) FROM items
WHERE brand IS NOT NULL AND TRIM(brand) != ''
ON CONFLICT (name) DO NOTHING;

INSERT INTO item_brands (item_id, brand_id)
SELECT i.id, b.id
FROM items i
JOIN brands b ON TRIM(i.brand) = b.name
WHERE i.brand IS NOT NULL AND TRIM(i.brand) != ''
ON CONFLICT DO NOTHING;

-- Migrate existing category data into categories table (if any)
INSERT INTO categories (name, is_default)
SELECT DISTINCT TRIM(category), false FROM items
WHERE category IS NOT NULL AND TRIM(category) != ''
  AND TRIM(category) NOT IN (SELECT name FROM categories WHERE is_default = true)
ON CONFLICT (name) DO NOTHING;