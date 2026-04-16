-- Add type and screenshot_url columns to testimonials
ALTER TABLE testimonials 
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- Update existing testimonials to be of type 'text'
UPDATE testimonials SET type = 'text' WHERE type IS NULL;

-- Comment on columns
COMMENT ON COLUMN testimonials.type IS 'Type of testimonial: text or screenshot';
COMMENT ON COLUMN testimonials.screenshot_url IS 'URL of the uploaded screenshot for screenshot-type testimonials';
