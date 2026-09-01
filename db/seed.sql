-- Seed the employees table.
-- Replace the sample rows below with the real names. Exactly one admin (father).

insert into employees (name, role) values
  ('Father', 'admin'),
  ('Employee One', 'staff'),
  ('Employee Two', 'staff')
on conflict (name) do nothing;
