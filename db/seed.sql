-- Seed the members table.
-- Usernames are private (login is by username, not a list). Exactly one admin.

insert into members (username, name, role, pin) values
  ('sailesh', 'Sailesh', 'admin', '2904'),
  ('sarath', 'Sarath', 'member', '0000')
on conflict (username) do nothing;
