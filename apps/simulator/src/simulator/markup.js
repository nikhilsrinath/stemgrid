// The simulator page markup, copied verbatim from the original index.html (still in the project root).
// Generated once by the Next.js port; edit this file directly from now on.
const markup = `<div class="app">
  <aside>
    <div class="brand">
      <div class="wordmark">StemGrid<span class="beta">BETA</span></div>
      <small>Build lab · parts library</small>
    </div>
    <div class="search">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
      <input id="q" placeholder="Search parts…" autocomplete="off">
    </div>
    <div class="lib" id="lib"></div>
    <div class="side-foot">
      <kbd>E</kbd><span>Rotate selected module</span>
      <kbd>R</kbd><span>Flip a Zap plug (keyed)</span>
      <kbd>Del</kbd><span>Remove selected part</span>
      <kbd>Esc</kbd><span>Deselect</span>
      <kbd>↑ ↓ ⏎ ←</kbd><span>Drive the OLED menu</span>
      <kbd>2 fingers</kbd><span>Pan · pinch to zoom</span>
      <kbd>⇧ + 2 fingers</kbd><span>Rotate the view</span>
    </div>
  </aside>

  <main id="stage">
    <canvas id="c" tabindex="0"></canvas>
    <div class="topbar">
      <button id="homeBtn" title="Back to the StemGrid home page"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>Home</button>
      <div class="doc"><span contenteditable="true" spellcheck="false" id="docName">Untitled build</span><span class="saved">· prototype</span></div>
      <div class="spacer"></div>
      <button id="viewBtn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>Reset view</button>
      <button id="clearBtn" class="danger">Clear all</button>
    </div>
    <div class="inspector hide" id="insp"></div>
    <div class="status" id="status"></div>
    <div class="empty" id="empty"><div class="box"><div class="arrow">←</div><b>Start with a base plate</b><p>Drag a <strong>Base plate</strong> from the parts library onto the table. Then add modules and wire them up with Zap connectors.</p></div></div>
    <div class="toast" id="toast"></div>
    <button class="fab" id="codeFab" title="Write code for your board"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m8 7-5 5 5 5"/><path d="m16 7 5 5-5 5"/><path d="m14 4-4 16"/></svg>Code</button>
    <section class="codep hide" id="codePanel" aria-label="Code editor">
      <header>
        <b>Code</b><span class="ce-board" id="ceBoard"></span>
        <button class="x" id="ceClose" title="Close">✕</button>
      </header>
      <div class="ce-empty" id="ceEmpty">
        <div>
          <svg width="54" height="54" viewBox="0 0 64 64"><rect x="8" y="14" width="48" height="36" rx="7" fill="#F4F1EA" stroke="#111" stroke-width="3"/><rect x="18" y="22" width="16" height="12" rx="2" fill="#2B8A6B"/><circle cx="44" cy="25" r="4" fill="#FF8044"/><circle cx="44" cy="38" r="4" fill="#FF8044"/><path d="M16 50v6M26 50v6M36 50v6M46 50v6" stroke="#111" stroke-width="3"/></svg>
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
`;
export default markup;
