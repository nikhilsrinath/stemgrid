-- TinkerAI: eight more beginner tutorials, one for each kind of module in the kit.
-- Generated (steps and line notes) and checked against the simulator's interpreter; edit them on the console's Tutorials page.
-- The first tutorial (led-ultrasonic) keeps sort 10; easy ones sort before it, medium ones after.
-- Re-running is safe: existing slugs are left as they are.

insert into public.tutorials (slug, title, summary, level, parts, minutes, sort, published, outro, code, steps) values
(
  'hello-oled', 'Say hello on the OLED screen',
  'Your first screen project: make the OLED display say hello and count the seconds. Learn how print works and how a loop repeats.',
  'easy', array['plate', 'quark', 'oled', 'zap'], 8, 1, true,
  'Change "Hello!" to your own name, press Run again, and watch it appear on the screen.',
$code$# Say hello on the OLED screen
count = 0
while True:
    oled.clear()
    oled.set_text_size(2)
    oled.print("Hello!")
    oled.set_text_size(1)
    oled.print("Seconds:", count)
    count = count + 1
    sleep(1)
$code$,
$steps$[
  {
    "do": "add",
    "part": "plate",
    "title": "Add a base plate",
    "hint": "Drag the Base plate from the parts list onto the table.",
    "why": "Every StemGrid build sits on a base plate. Its holes hold the modules in place."
  },
  {
    "do": "add",
    "part": "quark",
    "title": "Add the Quark C3 controller",
    "hint": "Drag the Quark C3 controller onto the base plate.",
    "why": "The Quark C3 is the brain. It runs your code and talks to every module wired to it."
  },
  {
    "do": "add",
    "part": "oled",
    "title": "Add the OLED display",
    "hint": "Drag the OLED display onto the base plate.",
    "why": "The OLED is a tiny screen, 128 dots wide and 64 dots tall. Your code can write words and draw on it."
  },
  {
    "do": "add",
    "part": "zap",
    "title": "Add a Zap connector",
    "hint": "Drag a Zap connector from the parts list onto the table.",
    "why": "A Zap connector is the cable that carries power and data between a module and the Quark."
  },
  {
    "do": "plug",
    "part": "oled",
    "title": "Plug a cable into the OLED display",
    "hint": "Drag one end of a free Zap connector into the socket on the OLED display.",
    "why": "The plug only fits one way round, just like the real kit."
  },
  {
    "do": "wire",
    "part": "oled",
    "to": "quark",
    "title": "Plug the other end into the Quark",
    "hint": "Drag the free end of that cable into any free port on the Quark C3.",
    "why": "Now the Quark can talk to the OLED display. Watch the little lights run along the cable."
  },
  {
    "do": "code",
    "title": "Read the code",
    "hint": "We've written the program for you. Read what each part does, then press Got it.",
    "notes": [
      {
        "lines": [
          2
        ],
        "text": "count = 0 makes a variable called count, a box that holds a number. It starts at 0."
      },
      {
        "lines": [
          3
        ],
        "text": "while True: repeats everything under it forever."
      },
      {
        "lines": [
          4
        ],
        "text": "oled.clear() wipes the screen so the new words don't pile up on the old ones."
      },
      {
        "lines": [
          5,
          6
        ],
        "text": "oled.set_text_size(2) makes the letters big, then oled.print(\"Hello!\") writes them."
      },
      {
        "lines": [
          7,
          8
        ],
        "text": "Back to small letters, then print the word Seconds: and the number in count."
      },
      {
        "lines": [
          9
        ],
        "text": "count = count + 1 adds one to the number."
      },
      {
        "lines": [
          10
        ],
        "text": "sleep(1) waits one second, then the loop starts again from the top."
      }
    ]
  },
  {
    "do": "run",
    "title": "Run the program",
    "hint": "Press ▶ Run in the code panel.",
    "why": "The code now runs on the Quark, line by line. The highlighted line shows where it is."
  }
]$steps$::jsonb
),
(
  'night-light', 'Night light with the light sensor',
  'Build a light that switches itself on when the room gets dark, using the light sensor and the Quark''s own LED.',
  'easy', array['plate', 'quark', 'light', 'zap'], 10, 2, true,
  'Try changing 30 to 60 so the light comes on earlier, or "yellow" to "purple" for a different glow.',
$code$# Night light: turns on by itself in the dark
while True:
    level = light()
    print("Light:", level, "%")
    if level < 30:
        led.color("yellow")
    else:
        led.off()
    sleep(0.2)
$code$,
$steps$[
  {
    "do": "add",
    "part": "plate",
    "title": "Add a base plate",
    "hint": "Drag the Base plate from the parts list onto the table.",
    "why": "Every StemGrid build sits on a base plate. Its holes hold the modules in place."
  },
  {
    "do": "add",
    "part": "quark",
    "title": "Add the Quark C3 controller",
    "hint": "Drag the Quark C3 controller onto the base plate.",
    "why": "The Quark C3 is the brain. It runs your code and talks to every module wired to it."
  },
  {
    "do": "add",
    "part": "light",
    "title": "Add the light sensor",
    "hint": "Drag the Light sensor onto the base plate.",
    "why": "The light sensor measures how bright it is, from 0 (pitch dark) to 100 (bright sunshine)."
  },
  {
    "do": "add",
    "part": "zap",
    "title": "Add a Zap connector",
    "hint": "Drag a Zap connector from the parts list onto the table.",
    "why": "A Zap connector is the cable that carries power and data between a module and the Quark."
  },
  {
    "do": "plug",
    "part": "light",
    "title": "Plug a cable into the light sensor",
    "hint": "Drag one end of a free Zap connector into the socket on the light sensor.",
    "why": "The plug only fits one way round, just like the real kit."
  },
  {
    "do": "wire",
    "part": "light",
    "to": "quark",
    "title": "Plug the other end into the Quark",
    "hint": "Drag the free end of that cable into any free port on the Quark C3.",
    "why": "Now the Quark can talk to the light sensor. Watch the little lights run along the cable."
  },
  {
    "do": "code",
    "title": "Read the code",
    "hint": "We've written the program for you. Read what each part does, then press Got it.",
    "notes": [
      {
        "lines": [
          2
        ],
        "text": "while True: keeps checking, over and over."
      },
      {
        "lines": [
          3
        ],
        "text": "light() reads the sensor and keeps the number, 0 to 100, in level."
      },
      {
        "lines": [
          4
        ],
        "text": "print() shows the level in the output box."
      },
      {
        "lines": [
          5,
          6
        ],
        "text": "if level < 30: when it's darker than 30, led.color(\"yellow\") turns the Quark's light on."
      },
      {
        "lines": [
          7,
          8
        ],
        "text": "else: when it's brighter, led.off() turns the light off."
      },
      {
        "lines": [
          9
        ],
        "text": "sleep(0.2) waits a fifth of a second before checking again."
      }
    ]
  },
  {
    "do": "run",
    "title": "Run the program",
    "hint": "Press ▶ Run in the code panel.",
    "why": "The code now runs on the Quark, line by line. The highlighted line shows where it is."
  },
  {
    "do": "try",
    "part": "light",
    "below": 30,
    "led": true,
    "title": "Make it dark",
    "hint": "Click the light sensor, then press Cover it (or slide Room light down below 30).",
    "why": "The sensor sees less light, the if is true, and the night light comes on. Uncover it and it goes off."
  }
]$steps$::jsonb
),
(
  'knob-colours', 'Colour changer with a knob',
  'Turn the potentiometer and the Quark''s light changes from green to yellow to red. Learn if, elif and else.',
  'easy', array['plate', 'quark', 'pot', 'zap'], 10, 3, true,
  'Add a fourth colour: change 66 to 50 and add another elif k < 80: with led.color("blue").',
$code$# Turn the knob to change the light's colour
while True:
    k = knob()
    print("Knob:", k, "%")
    if k < 33:
        led.color("green")
    elif k < 66:
        led.color("yellow")
    else:
        led.color("red")
    sleep(0.1)
$code$,
$steps$[
  {
    "do": "add",
    "part": "plate",
    "title": "Add a base plate",
    "hint": "Drag the Base plate from the parts list onto the table.",
    "why": "Every StemGrid build sits on a base plate. Its holes hold the modules in place."
  },
  {
    "do": "add",
    "part": "quark",
    "title": "Add the Quark C3 controller",
    "hint": "Drag the Quark C3 controller onto the base plate.",
    "why": "The Quark C3 is the brain. It runs your code and talks to every module wired to it."
  },
  {
    "do": "add",
    "part": "pot",
    "title": "Add the potentiometer",
    "hint": "Drag the Potentiometer onto the base plate.",
    "why": "A potentiometer is a knob. The Quark reads how far it is turned, from 0 to 100."
  },
  {
    "do": "add",
    "part": "zap",
    "title": "Add a Zap connector",
    "hint": "Drag a Zap connector from the parts list onto the table.",
    "why": "A Zap connector is the cable that carries power and data between a module and the Quark."
  },
  {
    "do": "plug",
    "part": "pot",
    "title": "Plug a cable into the potentiometer",
    "hint": "Drag one end of a free Zap connector into the socket on the potentiometer.",
    "why": "The plug only fits one way round, just like the real kit."
  },
  {
    "do": "wire",
    "part": "pot",
    "to": "quark",
    "title": "Plug the other end into the Quark",
    "hint": "Drag the free end of that cable into any free port on the Quark C3.",
    "why": "Now the Quark can talk to the potentiometer. Watch the little lights run along the cable."
  },
  {
    "do": "code",
    "title": "Read the code",
    "hint": "We've written the program for you. Read what each part does, then press Got it.",
    "notes": [
      {
        "lines": [
          3
        ],
        "text": "knob() reads how far the knob is turned, 0 to 100, and keeps it in k."
      },
      {
        "lines": [
          4
        ],
        "text": "print() shows the number in the output box."
      },
      {
        "lines": [
          5,
          6
        ],
        "text": "if k < 33: in the first third the light is green."
      },
      {
        "lines": [
          7,
          8
        ],
        "text": "elif means \"else if\": if it wasn't under 33 but is under 66, the light is yellow."
      },
      {
        "lines": [
          9,
          10
        ],
        "text": "else: anything left over, 66 and up, makes it red."
      },
      {
        "lines": [
          11
        ],
        "text": "sleep(0.1) waits a tenth of a second, then it checks the knob again."
      }
    ]
  },
  {
    "do": "run",
    "title": "Run the program",
    "hint": "Press ▶ Run in the code panel.",
    "why": "The code now runs on the Quark, line by line. The highlighted line shows where it is."
  },
  {
    "do": "try",
    "part": "pot",
    "above": 70,
    "led": true,
    "title": "Turn the knob up",
    "hint": "Drag the knob round to the right, or click it and slide Knob past 70.",
    "why": "Watch the light go green, then yellow, then red as the number grows."
  }
]$steps$::jsonb
),
(
  'button-light', 'Light switch with push buttons',
  'Hold button 1 for a white light and button 2 for a blue one. Your first project that reacts to a press.',
  'easy', array['plate', 'quark', 'buttons', 'zap'], 10, 4, true,
  'Change "blue" to "pink", or make button 1 blink with led.blink("red").',
$code$# Hold button 1 for white light, button 2 for blue
while True:
    if button(1):
        led.color("white")
    elif button(2):
        led.color("blue")
    else:
        led.off()
    sleep(0.05)
$code$,
$steps$[
  {
    "do": "add",
    "part": "plate",
    "title": "Add a base plate",
    "hint": "Drag the Base plate from the parts list onto the table.",
    "why": "Every StemGrid build sits on a base plate. Its holes hold the modules in place."
  },
  {
    "do": "add",
    "part": "quark",
    "title": "Add the Quark C3 controller",
    "hint": "Drag the Quark C3 controller onto the base plate.",
    "why": "The Quark C3 is the brain. It runs your code and talks to every module wired to it."
  },
  {
    "do": "add",
    "part": "buttons",
    "title": "Add the dual push button",
    "hint": "Drag the Dual push button onto the base plate.",
    "why": "It has two buttons. The Quark can tell whether each one is pressed."
  },
  {
    "do": "add",
    "part": "zap",
    "title": "Add a Zap connector",
    "hint": "Drag a Zap connector from the parts list onto the table.",
    "why": "A Zap connector is the cable that carries power and data between a module and the Quark."
  },
  {
    "do": "plug",
    "part": "buttons",
    "title": "Plug a cable into the push buttons",
    "hint": "Drag one end of a free Zap connector into the socket on the push buttons.",
    "why": "The plug only fits one way round, just like the real kit."
  },
  {
    "do": "wire",
    "part": "buttons",
    "to": "quark",
    "title": "Plug the other end into the Quark",
    "hint": "Drag the free end of that cable into any free port on the Quark C3.",
    "why": "Now the Quark can talk to the push buttons. Watch the little lights run along the cable."
  },
  {
    "do": "code",
    "title": "Read the code",
    "hint": "We've written the program for you. Read what each part does, then press Got it.",
    "notes": [
      {
        "lines": [
          2
        ],
        "text": "while True: keeps checking the buttons all the time."
      },
      {
        "lines": [
          3,
          4
        ],
        "text": "button(1) is True while button 1 is held down. Then the light turns white."
      },
      {
        "lines": [
          5,
          6
        ],
        "text": "elif button(2): if button 1 isn't down but button 2 is, the light turns blue."
      },
      {
        "lines": [
          7,
          8
        ],
        "text": "else: no button pressed, so the light goes off."
      },
      {
        "lines": [
          9
        ],
        "text": "sleep(0.05) is a tiny pause, so it checks about 20 times a second."
      }
    ]
  },
  {
    "do": "run",
    "title": "Run the program",
    "hint": "Press ▶ Run in the code panel.",
    "why": "The code now runs on the Quark, line by line. The highlighted line shows where it is."
  },
  {
    "do": "try",
    "part": "buttons",
    "above": 0,
    "led": true,
    "title": "Press and hold button 1",
    "hint": "Press and hold the white cap (button 1) on the push button module with your mouse.",
    "why": "While you hold it, button(1) is True and the light stays on. Let go and it turns off."
  }
]$steps$::jsonb
),
(
  'doorbell', 'Doorbell with a button and buzzer',
  'Press a button and the buzzer plays a ding-dong, just like a real doorbell. Wire two modules to the Quark.',
  'easy', array['plate', 'quark', 'buttons', 'buzzer', 'zap'], 12, 5, true,
  'Make your own tune: change the notes, like "G5" and "E5", or add a third buzzer.note line.',
$code$# Doorbell: press button 1 to ring
while True:
    if was_pressed(1):
        print("Ding dong!")
        buzzer.note("E5", 0.3)
        buzzer.note("C5", 0.5)
    sleep(0.05)
$code$,
$steps$[
  {
    "do": "add",
    "part": "plate",
    "title": "Add a base plate",
    "hint": "Drag the Base plate from the parts list onto the table.",
    "why": "Every StemGrid build sits on a base plate. Its holes hold the modules in place."
  },
  {
    "do": "add",
    "part": "quark",
    "title": "Add the Quark C3 controller",
    "hint": "Drag the Quark C3 controller onto the base plate.",
    "why": "The Quark C3 is the brain. It runs your code and talks to every module wired to it."
  },
  {
    "do": "add",
    "part": "buttons",
    "title": "Add the dual push button",
    "hint": "Drag the Dual push button onto the base plate.",
    "why": "Button 1 will be the doorbell button."
  },
  {
    "do": "add",
    "part": "buzzer",
    "title": "Add the buzzer",
    "hint": "Drag the Buzzer onto the base plate.",
    "why": "The buzzer can play any note, high or low."
  },
  {
    "do": "add",
    "part": "zap",
    "title": "Add a Zap connector",
    "hint": "Drag a Zap connector from the parts list onto the table.",
    "why": "A Zap connector is the cable that carries power and data between a module and the Quark."
  },
  {
    "do": "plug",
    "part": "buttons",
    "title": "Plug a cable into the push buttons",
    "hint": "Drag one end of a free Zap connector into the socket on the push buttons.",
    "why": "The plug only fits one way round, just like the real kit."
  },
  {
    "do": "wire",
    "part": "buttons",
    "to": "quark",
    "title": "Plug the other end into the Quark",
    "hint": "Drag the free end of that cable into any free port on the Quark C3.",
    "why": "Now the Quark can talk to the push buttons. Watch the little lights run along the cable."
  },
  {
    "do": "add",
    "part": "zap",
    "count": 2,
    "title": "Add a second Zap connector",
    "hint": "Drag another Zap connector onto the table. Each module needs its own cable."
  },
  {
    "do": "plug",
    "part": "buzzer",
    "title": "Plug a cable into the buzzer",
    "hint": "Drag one end of a free Zap connector into the socket on the buzzer.",
    "why": "The plug only fits one way round, just like the real kit."
  },
  {
    "do": "wire",
    "part": "buzzer",
    "to": "quark",
    "title": "Plug the other end into the Quark",
    "hint": "Drag the free end of that cable into any free port on the Quark C3.",
    "why": "Now the Quark can talk to the buzzer. Watch the little lights run along the cable."
  },
  {
    "do": "code",
    "title": "Read the code",
    "hint": "We've written the program for you. Read what each part does, then press Got it.",
    "notes": [
      {
        "lines": [
          3
        ],
        "text": "was_pressed(1) is True once for every press of button 1, even a quick tap."
      },
      {
        "lines": [
          4
        ],
        "text": "print() writes Ding dong! in the output box."
      },
      {
        "lines": [
          5
        ],
        "text": "buzzer.note(\"E5\", 0.3) plays the note E for 0.3 seconds: the \"ding\"."
      },
      {
        "lines": [
          6
        ],
        "text": "buzzer.note(\"C5\", 0.5) plays a lower C for half a second: the \"dong\"."
      },
      {
        "lines": [
          7
        ],
        "text": "sleep(0.05) is a tiny pause before checking the button again."
      }
    ]
  },
  {
    "do": "run",
    "title": "Run the program",
    "hint": "Press ▶ Run in the code panel.",
    "why": "The code now runs on the Quark, line by line. The highlighted line shows where it is."
  },
  {
    "do": "try",
    "part": "buttons",
    "sound": true,
    "title": "Ring the doorbell",
    "hint": "Click the white cap (button 1) on the push button module.",
    "why": "One press, one ding-dong. was_pressed only counts each press once."
  }
]$steps$::jsonb
),
(
  'parking-sensor', 'Parking sensor that beeps',
  'Like a car''s parking sensor: the closer something gets, the faster it beeps, and the light goes green, orange, then red.',
  'medium', array['plate', 'quark', 'ultrasonic', 'buzzer', 'zap'], 15, 20, true,
  'Make it stricter: change 10 to 15 and 30 to 40, press Run, and see how early it starts beeping.',
$code$# Parking sensor: beeps faster as you get closer
while True:
    d = distance()
    print(d, "cm")
    if d < 10:
        led.color("red")
        buzzer.beep()
        sleep(0.1)
    elif d < 30:
        led.color("orange")
        buzzer.beep()
        sleep(0.4)
    else:
        led.color("green")
        sleep(0.2)
$code$,
$steps$[
  {
    "do": "add",
    "part": "plate",
    "title": "Add a base plate",
    "hint": "Drag the Base plate from the parts list onto the table.",
    "why": "Every StemGrid build sits on a base plate. Its holes hold the modules in place."
  },
  {
    "do": "add",
    "part": "quark",
    "title": "Add the Quark C3 controller",
    "hint": "Drag the Quark C3 controller onto the base plate.",
    "why": "The Quark C3 is the brain. It runs your code and talks to every module wired to it."
  },
  {
    "do": "add",
    "part": "ultrasonic",
    "title": "Add the ultrasonic sensor",
    "hint": "Drag the Ultrasonic sensor onto the base plate.",
    "why": "It measures how far away things are by timing an echo, like a bat."
  },
  {
    "do": "add",
    "part": "buzzer",
    "title": "Add the buzzer",
    "hint": "Drag the Buzzer onto the base plate.",
    "why": "The buzzer makes the warning beeps."
  },
  {
    "do": "add",
    "part": "zap",
    "title": "Add a Zap connector",
    "hint": "Drag a Zap connector from the parts list onto the table.",
    "why": "A Zap connector is the cable that carries power and data between a module and the Quark."
  },
  {
    "do": "plug",
    "part": "ultrasonic",
    "title": "Plug a cable into the ultrasonic sensor",
    "hint": "Drag one end of a free Zap connector into the socket on the ultrasonic sensor.",
    "why": "The plug only fits one way round, just like the real kit."
  },
  {
    "do": "wire",
    "part": "ultrasonic",
    "to": "quark",
    "title": "Plug the other end into the Quark",
    "hint": "Drag the free end of that cable into any free port on the Quark C3.",
    "why": "Now the Quark can talk to the ultrasonic sensor. Watch the little lights run along the cable."
  },
  {
    "do": "add",
    "part": "zap",
    "count": 2,
    "title": "Add a second Zap connector",
    "hint": "Drag another Zap connector onto the table. Each module needs its own cable."
  },
  {
    "do": "plug",
    "part": "buzzer",
    "title": "Plug a cable into the buzzer",
    "hint": "Drag one end of a free Zap connector into the socket on the buzzer.",
    "why": "The plug only fits one way round, just like the real kit."
  },
  {
    "do": "wire",
    "part": "buzzer",
    "to": "quark",
    "title": "Plug the other end into the Quark",
    "hint": "Drag the free end of that cable into any free port on the Quark C3.",
    "why": "Now the Quark can talk to the buzzer. Watch the little lights run along the cable."
  },
  {
    "do": "code",
    "title": "Read the code",
    "hint": "We've written the program for you. Read what each part does, then press Got it.",
    "notes": [
      {
        "lines": [
          3
        ],
        "text": "distance() asks the ultrasonic sensor how far away the nearest thing is, in cm."
      },
      {
        "lines": [
          5,
          6,
          7,
          8
        ],
        "text": "Closer than 10 cm: red light, a beep, and only a short wait, so the beeps come fast."
      },
      {
        "lines": [
          9,
          10,
          11,
          12
        ],
        "text": "Between 10 and 30 cm: orange light and slower beeps, with a longer wait in between."
      },
      {
        "lines": [
          13,
          14,
          15
        ],
        "text": "Further away: a green light and no beep at all."
      }
    ]
  },
  {
    "do": "run",
    "title": "Run the program",
    "hint": "Press ▶ Run in the code panel.",
    "why": "The code now runs on the Quark, line by line. The highlighted line shows where it is."
  },
  {
    "do": "try",
    "part": "ultrasonic",
    "below": 10,
    "led": true,
    "sound": true,
    "title": "Park really close",
    "hint": "Drag the DRAG ME block above the sensor down until the distance is under 10 cm.",
    "why": "Listen to the beeps speed up as you get closer: that's the elif choosing a shorter sleep."
  }
]$steps$::jsonb
),
(
  'thermometer', 'Thermometer on the OLED screen',
  'Show the temperature and humidity on the screen, and turn the light red when it gets hot. Two modules, one program.',
  'medium', array['plate', 'quark', 'dht11', 'oled', 'zap'], 15, 21, true,
  'Change 30 to 26 so it warns you sooner, or show the temperature in Fahrenheit: t * 9 / 5 + 32.',
$code$# Thermometer: temperature on the screen, red light when it's hot
while True:
    t = temperature()
    oled.clear()
    oled.set_text_size(2)
    oled.print(t, "C")
    oled.set_text_size(1)
    oled.print("Humidity:", humidity(), "%")
    if t > 30:
        led.color("red")
        oled.print("It's hot!")
    else:
        led.color("blue")
    sleep(1)
$code$,
$steps$[
  {
    "do": "add",
    "part": "plate",
    "title": "Add a base plate",
    "hint": "Drag the Base plate from the parts list onto the table.",
    "why": "Every StemGrid build sits on a base plate. Its holes hold the modules in place."
  },
  {
    "do": "add",
    "part": "quark",
    "title": "Add the Quark C3 controller",
    "hint": "Drag the Quark C3 controller onto the base plate.",
    "why": "The Quark C3 is the brain. It runs your code and talks to every module wired to it."
  },
  {
    "do": "add",
    "part": "dht11",
    "title": "Add the temperature sensor",
    "hint": "Drag the Temp & humidity sensor onto the base plate.",
    "why": "The DHT11 measures the temperature (°C) and how damp the air is (humidity, %)."
  },
  {
    "do": "add",
    "part": "oled",
    "title": "Add the OLED display",
    "hint": "Drag the OLED display onto the base plate.",
    "why": "The screen will show the readings."
  },
  {
    "do": "add",
    "part": "zap",
    "title": "Add a Zap connector",
    "hint": "Drag a Zap connector from the parts list onto the table.",
    "why": "A Zap connector is the cable that carries power and data between a module and the Quark."
  },
  {
    "do": "plug",
    "part": "dht11",
    "title": "Plug a cable into the temperature sensor",
    "hint": "Drag one end of a free Zap connector into the socket on the temperature sensor.",
    "why": "The plug only fits one way round, just like the real kit."
  },
  {
    "do": "wire",
    "part": "dht11",
    "to": "quark",
    "title": "Plug the other end into the Quark",
    "hint": "Drag the free end of that cable into any free port on the Quark C3.",
    "why": "Now the Quark can talk to the temperature sensor. Watch the little lights run along the cable."
  },
  {
    "do": "add",
    "part": "zap",
    "count": 2,
    "title": "Add a second Zap connector",
    "hint": "Drag another Zap connector onto the table. Each module needs its own cable."
  },
  {
    "do": "plug",
    "part": "oled",
    "title": "Plug a cable into the OLED display",
    "hint": "Drag one end of a free Zap connector into the socket on the OLED display.",
    "why": "The plug only fits one way round, just like the real kit."
  },
  {
    "do": "wire",
    "part": "oled",
    "to": "quark",
    "title": "Plug the other end into the Quark",
    "hint": "Drag the free end of that cable into any free port on the Quark C3.",
    "why": "Now the Quark can talk to the OLED display. Watch the little lights run along the cable."
  },
  {
    "do": "code",
    "title": "Read the code",
    "hint": "We've written the program for you. Read what each part does, then press Got it.",
    "notes": [
      {
        "lines": [
          3
        ],
        "text": "temperature() reads the sensor and keeps the number in t."
      },
      {
        "lines": [
          4
        ],
        "text": "oled.clear() wipes the screen before writing the new reading."
      },
      {
        "lines": [
          5,
          6
        ],
        "text": "Big letters for the temperature, like 24 C."
      },
      {
        "lines": [
          7,
          8
        ],
        "text": "Small letters for the humidity, read straight from humidity()."
      },
      {
        "lines": [
          9,
          10,
          11
        ],
        "text": "if t > 30: when it's hot, the light turns red and the screen says It's hot!"
      },
      {
        "lines": [
          12,
          13
        ],
        "text": "else: the light stays a cool blue."
      },
      {
        "lines": [
          14
        ],
        "text": "sleep(1) waits a second. The DHT11 only gives a new reading once a second anyway."
      }
    ]
  },
  {
    "do": "run",
    "title": "Run the program",
    "hint": "Press ▶ Run in the code panel.",
    "why": "The code now runs on the Quark, line by line. The highlighted line shows where it is."
  },
  {
    "do": "try",
    "part": "dht11",
    "above": 30,
    "title": "Make it hot",
    "hint": "Click the temperature sensor and slide Room temperature above 30 °C. It takes a few seconds to catch up.",
    "why": "Watch the screen say It's hot! and the light turn red."
  }
]$steps$::jsonb
),
(
  'servo-knob', 'Steer a servo with a knob',
  'Turn the knob and the servo arm turns with it. Learn how to scale a number from 0–100 to 0–180 degrees.',
  'medium', array['plate', 'quark', 'pot', 'servo', 'zap'], 15, 22, true,
  'Make the arm turn the other way: change the angle line to angle = 180 - knob() * 1.8.',
$code$# Turn the knob and the servo arm follows
while True:
    angle = knob() * 1.8
    servo.angle(angle)
    print("Angle:", round(angle))
    sleep(0.05)
$code$,
$steps$[
  {
    "do": "add",
    "part": "plate",
    "title": "Add a base plate",
    "hint": "Drag the Base plate from the parts list onto the table.",
    "why": "Every StemGrid build sits on a base plate. Its holes hold the modules in place."
  },
  {
    "do": "add",
    "part": "quark",
    "title": "Add the Quark C3 controller",
    "hint": "Drag the Quark C3 controller onto the base plate.",
    "why": "The Quark C3 is the brain. It runs your code and talks to every module wired to it."
  },
  {
    "do": "add",
    "part": "pot",
    "title": "Add the potentiometer",
    "hint": "Drag the Potentiometer onto the base plate.",
    "why": "The knob will steer the servo."
  },
  {
    "do": "add",
    "part": "servo",
    "title": "Add the servo motor",
    "hint": "Drag the Servo motor onto the base plate.",
    "why": "A servo turns its arm to an exact angle, from 0 to 180 degrees."
  },
  {
    "do": "add",
    "part": "zap",
    "title": "Add a Zap connector",
    "hint": "Drag a Zap connector from the parts list onto the table.",
    "why": "A Zap connector is the cable that carries power and data between a module and the Quark."
  },
  {
    "do": "plug",
    "part": "pot",
    "title": "Plug a cable into the potentiometer",
    "hint": "Drag one end of a free Zap connector into the socket on the potentiometer.",
    "why": "The plug only fits one way round, just like the real kit."
  },
  {
    "do": "wire",
    "part": "pot",
    "to": "quark",
    "title": "Plug the other end into the Quark",
    "hint": "Drag the free end of that cable into any free port on the Quark C3.",
    "why": "Now the Quark can talk to the potentiometer. Watch the little lights run along the cable."
  },
  {
    "do": "add",
    "part": "zap",
    "count": 2,
    "title": "Add a second Zap connector",
    "hint": "Drag another Zap connector onto the table. Each module needs its own cable."
  },
  {
    "do": "plug",
    "part": "servo",
    "title": "Plug a cable into the servo motor",
    "hint": "Drag one end of a free Zap connector into the socket on the servo motor.",
    "why": "The plug only fits one way round, just like the real kit."
  },
  {
    "do": "wire",
    "part": "servo",
    "to": "quark",
    "title": "Plug the other end into the Quark",
    "hint": "Drag the free end of that cable into any free port on the Quark C3.",
    "why": "Now the Quark can talk to the servo motor. Watch the little lights run along the cable."
  },
  {
    "do": "code",
    "title": "Read the code",
    "hint": "We've written the program for you. Read what each part does, then press Got it.",
    "notes": [
      {
        "lines": [
          3
        ],
        "text": "knob() is 0 to 100, but a servo wants 0 to 180 degrees. Times 1.8 stretches one to fit the other."
      },
      {
        "lines": [
          4
        ],
        "text": "servo.angle(angle) tells the servo where to point its arm."
      },
      {
        "lines": [
          5
        ],
        "text": "round() drops the decimals so the output box shows a whole number."
      },
      {
        "lines": [
          6
        ],
        "text": "sleep(0.05) waits a moment, then it reads the knob again."
      }
    ]
  },
  {
    "do": "run",
    "title": "Run the program",
    "hint": "Press ▶ Run in the code panel.",
    "why": "The code now runs on the Quark, line by line. The highlighted line shows where it is."
  },
  {
    "do": "try",
    "part": "pot",
    "above": 90,
    "title": "Turn the knob all the way",
    "hint": "Drag the knob round to the right (or click it and slide Knob past 90). Watch the servo arm swing.",
    "why": "Knob 100 times 1.8 is 180: the arm points all the way round."
  }
]$steps$::jsonb
)
on conflict (slug) do nothing;
