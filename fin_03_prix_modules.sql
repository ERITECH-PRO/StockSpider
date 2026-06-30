-- fin_03_prix_modules.sql — cout (Achat D/TTC) + prix Gros + marges, par nom de produit
-- cost_price = Achat D/TTC  /  recommended_price = Gros  /  margin = Gros - cout  /  margin_percent = marge sur Gros

UPDATE products SET cost_price=42.37, recommended_price=82.4, margin=40.03, margin_percent=48.58 WHERE name='SpiderRoll 1X';
UPDATE products SET cost_price=58.47, recommended_price=188.2, margin=129.73, margin_percent=68.93 WHERE name='SpiderRoll 2X';
UPDATE products SET cost_price=68.52, recommended_price=270.6, margin=202.08, margin_percent=74.68 WHERE name='SpiderRoll 3X';
UPDATE products SET cost_price=91.35, recommended_price=352.9, margin=261.55, margin_percent=74.11 WHERE name='SpiderRoll 4X V1';
UPDATE products SET cost_price=114.67, recommended_price=435.3, margin=320.63, margin_percent=73.66 WHERE name='SpiderRoll 5X V1';
UPDATE products SET cost_price=120.75, recommended_price=517.6, margin=396.85, margin_percent=76.67 WHERE name='SpiderRoll 6X V1';
UPDATE products SET cost_price=203.21, recommended_price=682.4, margin=479.19, margin_percent=70.22 WHERE name='SpiderRoll 8X V1';
UPDATE products SET cost_price=34.19, recommended_price=64.7, margin=30.51, margin_percent=47.16 WHERE name='Spider 1R5';
UPDATE products SET cost_price=42.37, recommended_price=82.4, margin=40.03, margin_percent=48.58 WHERE name='Spider Duo';
UPDATE products SET cost_price=34.19, recommended_price=64.7, margin=30.51, margin_percent=47.16 WHERE name='Spider S10';
UPDATE products SET cost_price=39.27, recommended_price=69.41, margin=30.14, margin_percent=43.42 WHERE name='Spider S16';
