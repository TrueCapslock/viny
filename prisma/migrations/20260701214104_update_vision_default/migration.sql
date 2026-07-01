-- Update the default for new users (and for any future inserts that don't
-- explicitly pass visionModel). The previous default
-- `google/gemini-2.0-flash-exp:free` was deprecated by OpenRouter and
-- returns 404. `nvidia/nemotron-nano-12b-v2-vl:free` is the closest
-- free-tier replacement: a 12B vision-language model explicitly
-- described by the provider as "designed for document intelligence",
-- with 128k max completion (plenty for an OCR string) and no content
-- moderation that would block alcohol/brand labels.
ALTER TABLE "User" ALTER COLUMN "visionModel" SET DEFAULT 'nvidia/nemotron-nano-12b-v2-vl:free';

-- Backfill existing users who still have the old broken default. This
-- is idempotent: only touches rows where visionModel is exactly the
-- deprecated value. Users who set a custom model in /profil are
-- unaffected. The next v0.12.x build will run this as part of
-- `prisma migrate deploy` in the Vercel build script.
UPDATE "User"
SET "visionModel" = 'nvidia/nemotron-nano-12b-v2-vl:free'
WHERE "visionModel" = 'google/gemini-2.0-flash-exp:free';
