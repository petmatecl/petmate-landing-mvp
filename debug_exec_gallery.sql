-- Running migration 37 to ensure gallery column exists
-- This is a safety measure as I might have missed executing it earlier
\i migrations/37_add_pet_gallery.sql
