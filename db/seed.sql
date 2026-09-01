-- Seed the members table.
-- Usernames are private (login is by username, not a list). Exactly one admin.

insert into members (username, name, role) values
  ('sailesh', 'Sailesh', 'admin'),
  ('sarath', 'Sarath', 'member')
on conflict (username) do nothing;
