-- Add x_posted column to the images table
ALTER TABLE images 
ADD COLUMN x_posted BOOLEAN DEFAULT FALSE;

-- Add an index for efficient filtering
CREATE INDEX idx_images_x_posted ON images(x_posted);

-- Add a comment to explain the column
COMMENT ON COLUMN images.x_posted IS 'Flag indicating whether this image has been posted to X (Twitter)';
