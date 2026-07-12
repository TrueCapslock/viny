-- v0.18.0: add Wine.ean for the EAN barcode scanner feature.
--
-- Stored as nullable TEXT (no fixed-width check; EAN-13, EAN-8 and
-- UPC-A all fit). Indexed for fast "do I already have this bottle?"
-- lookups. NOT @unique — multiple users naturally own the same EAN
-- and the same user may legitimately re-add the same bottle.

ALTER TABLE "Wine" ADD COLUMN "ean" TEXT;
CREATE INDEX "Wine_ean_idx" ON "Wine"("ean");
