-- TinkerAI: guided tutorials in the simulator.
-- A tutorial is a list of steps (jsonb) the simulator walks a student through: add these parts,
-- plug this cable, read this code (filled in for them), run it, try it. The StemGrid team adds and
-- edits tutorials on the console (apps/portal, admin.stemgrid.in) with the service role; everyone
-- else can only read published ones. Step format: see apps/simulator/src/lib/tutorials.ts.

create table public.tutorials (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,59}$'),
  title        text not null check (char_length(title) between 3 and 120),
  summary      text not null default '' check (char_length(summary) <= 400),
  level        text not null default 'easy' check (level in ('easy', 'medium', 'hard')),
  board        text not null default 'quark',
  parts        text[] not null default '{}',          -- parts-library ids, for the cards and "sort by components"
  minutes      int not null default 10 check (minutes between 1 and 240),
  code         text not null default '',             -- the program the code step fills in
  outro        text not null default '' check (char_length(outro) <= 400),   -- shown when it's done: something to try next
  steps        jsonb not null default '[]'::jsonb check (jsonb_typeof(steps) = 'array'),
  published    boolean not null default false,
  sort         int not null default 100,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger tutorials_updated_at before update on public.tutorials
  for each row execute function public.set_updated_at();

alter table public.tutorials enable row level security;
create policy "Read published tutorials" on public.tutorials
  for select to anon, authenticated using (published);
revoke all on public.tutorials from anon, authenticated;
grant select on public.tutorials to anon, authenticated;

-- Where each student is in each tutorial (their own rows only).
create table public.tutorial_progress (
  user_id      uuid not null references auth.users (id) on delete cascade,
  tutorial_id  uuid not null references public.tutorials (id) on delete cascade,
  step         int not null default 0 check (step >= 0),
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_id, tutorial_id)
);
create trigger tutorial_progress_updated_at before update on public.tutorial_progress
  for each row execute function public.set_updated_at();

alter table public.tutorial_progress enable row level security;
create policy "Read own progress" on public.tutorial_progress
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Create own progress" on public.tutorial_progress
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own progress" on public.tutorial_progress
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.tutorial_progress from anon, authenticated;
grant select, insert, update on public.tutorial_progress to authenticated;

-- ---------------------------------------------------------------- the first tutorial
insert into public.tutorials (slug, title, summary, level, parts, minutes, sort, published, outro, code, steps) values (
  'led-ultrasonic',
  'LED on/off using ultrasonic sensor',
  'Wave your hand near the ultrasonic sensor and the Quark''s light turns on. Learn how a sensor measures distance and how an if/else decides what happens.',
  'easy',
  array['plate', 'quark', 'ultrasonic', 'zap'],
  10, 10, true,
  'Try changing 15 in the code to 40, press Run again, and see how far away your hand can be now.',
$code$# LED on/off with the ultrasonic sensor
# Bring your hand close and the light turns on.
while True:
    d = distance()
    print("Distance:", d, "cm")
    if d < 15:
        led.on()
    else:
        led.off()
    sleep(0.2)
$code$,
$steps$[
  { "do": "add", "part": "plate",
    "title": "Add a base plate",
    "hint": "Drag the Base plate from the parts list onto the table.",
    "why": "Every StemGrid build sits on a base plate. Its holes hold the modules in place." },
  { "do": "add", "part": "quark",
    "title": "Add the Quark C3 controller",
    "hint": "Drag the Quark C3 controller onto the base plate.",
    "why": "The Quark C3 is the brain. It runs your code and talks to every module wired to it." },
  { "do": "add", "part": "ultrasonic",
    "title": "Add the ultrasonic sensor",
    "hint": "Drag the Ultrasonic sensor onto the base plate, next to the Quark.",
    "why": "It sends out a sound too high for you to hear and times the echo to work out how far away things are." },
  { "do": "add", "part": "zap",
    "title": "Add a Zap connector",
    "hint": "Drag a Zap connector from the parts list onto the table.",
    "why": "A Zap connector is the cable that carries power and data between a module and the Quark." },
  { "do": "plug", "part": "ultrasonic",
    "title": "Plug one end into the sensor",
    "hint": "Drag one end of the Zap connector into the socket on the ultrasonic sensor.",
    "why": "The plug only fits one way round, just like the real kit." },
  { "do": "wire", "part": "ultrasonic", "to": "quark",
    "title": "Plug the other end into the Quark",
    "hint": "Drag the free end of the cable into any port on the Quark C3.",
    "why": "Now the Quark can read the sensor. Watch the little lights run along the cable." },
  { "do": "code",
    "title": "Read the code",
    "hint": "We've written the program for you. Read what each part does, then press Got it.",
    "notes": [
      { "lines": [3], "text": "while True: repeats everything under it forever, so the board keeps checking." },
      { "lines": [4], "text": "distance() asks the ultrasonic sensor how far away the nearest thing is, in centimetres, and keeps it in d." },
      { "lines": [5], "text": "print() shows the distance in the output box, so you can see what the sensor sees." },
      { "lines": [6, 7], "text": "if d < 15: when something is closer than 15 cm, led.on() turns the Quark's light on." },
      { "lines": [8, 9], "text": "else: anything further away, and led.off() turns the light off." },
      { "lines": [10], "text": "sleep(0.2) waits a fifth of a second before checking again." }
    ] },
  { "do": "run",
    "title": "Run the program",
    "hint": "Press ▶ Run in the code panel.",
    "why": "The code now runs on the Quark, line by line. The highlighted line shows where it is." },
  { "do": "try", "part": "ultrasonic", "below": 15, "led": true,
    "title": "Bring your hand close",
    "hint": "The block marked DRAG ME above the sensor is your hand. Drag it down towards the sensor until the distance is under 15 cm.",
    "why": "The sensor sees something close, the if is true, and the light comes on. Move it away again and it goes off." }
]$steps$::jsonb
);
