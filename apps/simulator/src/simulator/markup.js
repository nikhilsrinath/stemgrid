// The simulator page markup. Edit this file directly.
// Layout: a full-width app bar on top and the 3D stage filling the rest. Inspector, code panel and
// status sit on the stage as floating panels. The parts library (#partsPal) is a sidebar on desktop
// and, on touch screens (iPad, tablets), a dialog opened from the Parts button in the bottom-right corner.
const ICON = {
  back: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
  reset: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
  trash: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>',
  keys: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/></svg>',
  code: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m8 7-5 5 5 5"/><path d="m16 7 5 5-5 5"/></svg>',
  save: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h11l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M7 3v5h8"/><path d="M7 21v-7h10v7"/></svg>',
  parts: '<svg class="a" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><path d="M17.25 13.5v7.5M13.5 17.25H21"/></svg>',
  collapse: '<svg class="ic-side" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M9 4v16"/><path d="m15.5 10-2 2 2 2"/></svg>',
  zoomIn: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  zoomOut: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14"/></svg>',
  partsX: '<svg class="x" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  close: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  search: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
};

const markup = `<div class="app">
  <header class="appbar">
    <div class="ab-group">
      <button id="homeBtn" class="icon-btn" title="Back to the StemGrid home page" aria-label="Home">${ICON.back}</button>
      <div class="brand">
        <img class="brand-logo" src="/brand/stemgrid-logo.png" alt="StemGrid Tech Labs" width="640" height="287" />
        <span class="beta">Beta</span>
      </div>
      <span class="sep"></span>
      <div class="doc"><span contenteditable="true" spellcheck="false" id="docName">Untitled build</span><span class="saved" id="saveState" data-s="guest" role="status" aria-live="polite"></span></div>
    </div>
    <div class="ab-group">
      <details class="help" id="helpMenu">
        <summary class="icon-btn" title="Keyboard shortcuts" aria-label="Keyboard shortcuts">${ICON.keys}</summary>
        <div class="help-pop">
          <div class="help-h">Shortcuts</div>
          <div class="help-grid">
            <span>Open or close the parts library</span><kbd>P</kbd>
            <span>Zoom in / out</span><kbd>+ −</kbd>
            <span>Rotate selected module</span><kbd>E</kbd>
            <span>Flip a Zap plug</span><kbd>R</kbd>
            <span>Remove selected part</span><kbd>Del</kbd>
            <span>Deselect</span><kbd>Esc</kbd>
            <span>Drive the OLED menu</span><kbd>↑ ↓ ⏎ ←</kbd>
            <span>Pan · pinch to zoom</span><kbd>2 fingers</kbd>
            <span>Rotate the view</span><kbd>⇧ + 2 fingers</kbd>
            <span>Touch: zoom · pan · turn</span><kbd>pinch · drag · twist</kbd>
            <span>Touch: tilt and orbit</span><kbd>1 finger</kbd>
          </div>
        </div>
      </details>
      <button id="viewBtn" class="ghost" title="Reset the camera">${ICON.reset}<span class="lbl">Reset view</span></button>
      <button id="clearBtn" class="ghost danger" title="Remove everything">Clear all</button>
      <span class="sep"></span>
      <button id="saveBtn" class="ghost" title="Save (Ctrl + S)">${ICON.save}<span class="lbl">Save</span></button>
      <button class="fab" id="codeFab" title="Write code for your board">${ICON.code}Code</button>
      <div class="acct" id="acct"></div>
    </div>
  </header>

  <div class="workspace">
    <section class="pal" id="partsPal" role="dialog" aria-label="Parts library" aria-hidden="true">
      <header class="pal-h">
        <div class="pal-t"><b>Parts</b><span id="palHint">Drag a part onto the table</span></div>
        <button id="palClose" class="icon-btn" title="Close (P)" aria-label="Close the parts library">${ICON.close}${ICON.collapse}</button>
      </header>
      <div class="search">${ICON.search}<input id="q" placeholder="Search parts" autocomplete="off" enterkeyhint="search"></div>
      <div class="pal-cats" id="palCats" aria-label="Part categories"></div>
      <div class="lib" id="lib"></div>
    </section>
    <main id="stage">
      <canvas id="c" tabindex="0"></canvas>
      <div class="inspector hide" id="insp"></div>
      <div class="empty" id="empty"><div class="box"><div class="arrow" id="emptyArrow">←</div><b>Start with a base plate</b><p id="emptyText">Drag a <strong>Base plate</strong> from the parts list onto the table. Then add modules and wire them up with Zap connectors.</p></div></div>
      <div class="dock-l">
        <div class="zoom" role="group" aria-label="Zoom">
          <button id="zoomOut" title="Zoom out (−)" aria-label="Zoom out">${ICON.zoomOut}</button>
          <button id="zoomIn" title="Zoom in (+)" aria-label="Zoom in">${ICON.zoomIn}</button>
        </div>
        <div class="status" id="status"></div>
      </div>
      <div class="dock">
        <button class="parts-fab" id="partsFab" aria-controls="partsPal" aria-expanded="false" title="Open the parts library (P)">
          <span class="pf-ic">${ICON.parts}${ICON.partsX}</span>
          <span class="pf-l"><span class="o">Parts</span><span class="c">Drop here to cancel</span></span>
          <kbd>P</kbd>
        </button>
      </div>
      <div class="toast" id="toast"></div>
      <section class="codep hide" id="codePanel" aria-label="Code editor">
        <header>
          <b>Code</b><span class="ce-board" id="ceBoard"></span>
          <button class="x" id="ceClose" title="Close" aria-label="Close">✕</button>
        </header>
        <div class="ce-empty" id="ceEmpty">
          <div>
            <svg width="54" height="54" viewBox="0 0 64 64"><rect x="8" y="14" width="48" height="36" rx="7" fill="#F4F1EA" stroke="#1a1a1a" stroke-width="2.5"/><rect x="18" y="22" width="16" height="12" rx="2" fill="#2B8A6B"/><circle cx="44" cy="25" r="4" fill="#FF8044"/><circle cx="44" cy="38" r="4" fill="#FF8044"/><path d="M16 50v6M26 50v6M36 50v6M46 50v6" stroke="#1a1a1a" stroke-width="2.5"/></svg>
            <b>Add a board to start coding</b>
            <p>Your code runs on a Quark C3 controller, just like the real kit. Drag one from the parts library onto a base plate, then wire up some modules.</p>
            <button id="ceShowBoard">Show me the board</button>
          </div>
        </div>
        <div class="ce-main" id="ceMain" hidden>
          <div class="ce-bar">
            <select id="ceEx"><option value="">Load an example…</option></select>
            <button class="run" id="ceRun" title="Run (Ctrl + Enter)">▶ Run</button><button id="ceStop">■ Stop</button>
          </div>
          <div class="ce-wrap">
            <div class="ce-gut" id="ceGut"></div>
            <div class="ce-area"><div class="ce-line" id="ceLine"></div><pre id="cePre" aria-hidden="true"></pre><textarea id="ceTa" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="Code"></textarea></div>
          </div>
          <div class="ce-ref" id="ceRef"></div>
          <div class="ce-out" id="ceOut"></div>
          <div class="ce-status" id="ceStatus">Ready</div>
        </div>
      </section>
    </main>
  </div>
</div>
`;
export default markup;
