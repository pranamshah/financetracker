-- Seed the members table.
-- Replace the placeholder rows below with the real usernames + names.
-- Exactly one admin. Usernames are private (login is by username, not a list).

insert into members (username, name, role) values
  ('owner', 'Owner', 'admin'),
  ('m1', 'Member One', 'member'),
  ('m2', 'Member Two', 'member')
on conflict (username) do nothing;
