-- One-time migration: maps legacy v1 category labels (pre-Finnish schema) to Finnish.
-- WHEN literals below must match category values stored before this migration ran.

BEGIN;

ALTER TABLE receipts DROP CONSTRAINT receipts_category_check;

UPDATE receipts SET category = CASE category
  WHEN 'Еда'       THEN 'Ruoka'
  WHEN 'Транспорт' THEN 'Liikenne'
  WHEN 'Техника'   THEN 'Elektroniikka'
  WHEN 'Досуг'     THEN 'Vapaa-aika'
  WHEN 'Другое'    THEN 'Muu'
  ELSE 'Muu'
END;

ALTER TABLE receipts ADD CONSTRAINT receipts_category_check
  CHECK (category IN ('Ruoka', 'Liikenne', 'Elektroniikka', 'Vapaa-aika', 'Muu'));

COMMIT;
