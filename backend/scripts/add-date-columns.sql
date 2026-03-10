-- Ajoute la colonne date (éditable sous le titre) aux tables existantes.
-- À exécuter une fois si les colonnes n'existent pas encore.

ALTER TABLE activite_support ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE fiche_eps ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE sequence ADD COLUMN IF NOT EXISTS date DATE;
