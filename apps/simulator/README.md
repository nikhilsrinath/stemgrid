# StemGrid Beta: Quark Kit simulator

A 3D, in-browser simulator of the StemGrid Quark kit. You drag modules onto the base plate, wire them with Zap connectors, and code them in Python.

## How to run

This app lives in `apps/simulator` of the StemGrid monorepo and deploys to simulator.stemgrid.in. The services site (`apps/web`) links to it from its top bar. It is built with Next.js and needs Node.js 20.9 or newer.

```
pnpm install      (run once, from the repo root)
pnpm dev:sim      (or `pnpm dev` from the root to run this and the services site together)
```

Open http://localhost:3001 and press **Run simulator**. For a production build, run `pnpm build` and then `pnpm start` in this folder.

The 3D engine (Three.js 0.160.0) installs from npm. The Poppins font loads from Google Fonts, so you need an internet connection.

## What's in the folder

```
apps/simulator/
├── src/
│   ├── app/              Next.js routes: / (landing page) and /simulator
│   └── simulator/        the simulator engine (3D scene, sensors, Python, OLED, servo, buzzer)
├── public/assets/        the module photos and the X1 console image
├── legacy/               the original single-file prototype, kept for comparison
│                         (double-click legacy/Start StemGrid.bat to run it)
└── README.md
```

## Modules

| Type | Modules |
|---|---|
| Brain | Quark C3 controller |
| Sensors | Ultrasonic, DHT11 temperature and humidity, Light, IR receiver and remote, RFID |
| Inputs | Potentiometer, Dual push button |
| Outputs | OLED display, Servo motor, Buzzer |
| Wiring | Base plate, Zap connector |

Sound (buzzer, servo hum) starts after your first click on the page. Browsers block audio until then.
