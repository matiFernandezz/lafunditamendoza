-- Se extiende HOLALAFUNDITA10 hasta las 21:00 del 31/10/2026 (hora de Argentina).
update coupons
set expires_at = timestamptz '2026-10-31 21:00:00-03'
where code = 'HOLALAFUNDITA10';
