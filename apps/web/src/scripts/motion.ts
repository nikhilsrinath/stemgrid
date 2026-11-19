// Shared motion engine: GSAP + ScrollTrigger + Lenis smooth scrolling.
// Imported by every animated component; Astro bundles it once.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

export const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const finePointer = window.matchMedia("(pointer: fine)").matches;

let lenis: Lenis | null = null;

if (!reducedMotion) {
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.9 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis?.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

// Smooth in-page anchor links.
document.addEventListener("click", (e) => {
  const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
  if (!link) return;
  const id = link.getAttribute("href")!;
  const target = id.length > 1 ? document.querySelector<HTMLElement>(id) : null;
  if (!target) return;
  e.preventDefault();
  if (lenis) lenis.scrollTo(target, { offset: -20, duration: 1.6 });
  else target.scrollIntoView();
});

// Top progress "cable".
const progress = document.querySelector<HTMLElement>("[data-scroll-progress]");
if (progress) {
  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: (self) => progress.style.setProperty("--p", self.progress.toFixed(4)),
  });
}

window.addEventListener("load", () => ScrollTrigger.refresh());

export { gsap, ScrollTrigger, lenis };
