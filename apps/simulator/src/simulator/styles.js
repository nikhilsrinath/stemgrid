// The simulator stylesheet, copied verbatim from the original index.html (still in the project root).
// Generated once by the Next.js port; edit this file directly from now on.
const styles = `  :root{
    --sg-red:#E4121B; --sg-red-deep:#B30912; --sg-cream:#FFF2DF; --sg-ink:#111111; --sg-blush:#FAE3D1;
    --sg-module:#FF8044; --ok:#18A058; --muted:#6b6259; --side-w:320px;
  }
  *{box-sizing:border-box}
  html,body{margin:0;height:100%;overflow:hidden;background:var(--sg-red);font-family:Poppins,system-ui,sans-serif;color:var(--sg-ink)}
  .app{display:flex;height:100vh}

  /* ---------- side nav ---------- */
  aside{width:var(--side-w);flex:none;display:flex;flex-direction:column;background:#fff;border-right:3px solid var(--sg-ink);z-index:5;user-select:none}
  .brand{background:var(--sg-red);color:var(--sg-cream);padding:18px 18px 16px;border-bottom:3px solid var(--sg-ink);position:relative;overflow:hidden}
  .brand::before{content:"";position:absolute;inset:0;background-image:radial-gradient(var(--sg-red-deep) 7px,transparent 8px);background-size:28px 28px;opacity:.55}
  .brand>*{position:relative}
  .wordmark{font-weight:900;font-size:26px;letter-spacing:-.02em;line-height:1;text-shadow:3px 3px 0 var(--sg-red-deep)}
  .beta{display:inline-block;vertical-align:middle;margin-left:8px;background:var(--sg-ink);color:#fff;font-size:10px;font-weight:800;letter-spacing:.18em;padding:4px 8px;border-radius:999px;text-shadow:none}
  .brand small{display:block;margin-top:6px;font-size:11px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;opacity:.9}
  .search{margin:14px 14px 6px;position:relative}
  .search input{width:100%;font:500 13px Poppins,sans-serif;padding:10px 12px 10px 36px;border:2px solid var(--sg-ink);border-radius:12px;background:var(--sg-cream);outline:none}
  .search input:focus{box-shadow:3px 3px 0 var(--sg-ink)}
  .search svg{position:absolute;left:12px;top:50%;transform:translateY(-50%)}
  .lib{flex:1;overflow-y:auto;padding:4px 14px 14px}
  .lib::-webkit-scrollbar{width:8px}.lib::-webkit-scrollbar-thumb{background:#ddd;border-radius:8px}
  .cat{margin-top:12px}
  .cat-h{display:flex;align-items:center;gap:8px;cursor:pointer;padding:6px 2px;font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase}
  .cat-h .n{margin-left:auto;font-size:10px;letter-spacing:0;background:var(--sg-cream);border:1.5px solid var(--sg-ink);border-radius:999px;padding:0 7px}
  .cat-h .chev{transition:transform .2s}
  .cat.closed .chev{transform:rotate(-90deg)} .cat.closed .items{display:none}
  .items{display:flex;flex-direction:column;gap:8px;margin-top:4px}
  .item{display:flex;align-items:center;gap:10px;padding:8px;border:2px solid var(--sg-ink);border-radius:14px;background:#fff;box-shadow:3px 3px 0 var(--sg-ink);cursor:grab;transition:transform .1s,box-shadow .1s;touch-action:none}
  .item:hover{transform:translate(-1px,-1px);box-shadow:4px 4px 0 var(--sg-ink);background:#fffaf2}
  .item:active{cursor:grabbing}
  .item .th{width:52px;height:52px;flex:none;border-radius:10px;background:var(--sg-cream);display:grid;place-items:center;overflow:hidden}
  .item .th img{width:100%;height:100%;object-fit:contain;pointer-events:none}
  .item .tx{min-width:0;flex:1}
  .item b{display:block;font-size:13px;line-height:1.2}
  .item span{display:block;font-size:11px;color:var(--muted);line-height:1.35;margin-top:2px}
  .item .grip{flex:none;opacity:.5}
  .item.soon{cursor:not-allowed;border-style:dashed;box-shadow:none;opacity:.55}
  .item.soon:hover{transform:none;background:#fff}
  .pill{flex:none;font-size:9px;font-weight:800;letter-spacing:.14em;border-radius:999px;padding:3px 7px;background:#eee;color:#555}
  .pill.live{background:var(--ok);color:#fff}
  .side-foot{border-top:2px solid var(--sg-ink);padding:10px 14px;font-size:11px;color:var(--muted);display:grid;grid-template-columns:auto 1fr;gap:4px 10px;background:#fffaf2}
  kbd{font:700 10px ui-monospace,monospace;border:1.5px solid var(--sg-ink);border-bottom-width:3px;border-radius:5px;padding:0 5px;color:var(--sg-ink);background:#fff;justify-self:start}

  /* ---------- stage ---------- */
  main{position:relative;flex:1;min-width:0}
  #c{display:block;width:100%;height:100%;touch-action:none;outline:none}
  .topbar{position:absolute;left:16px;right:16px;top:16px;display:flex;gap:10px;align-items:center;pointer-events:none}
  .topbar>*{pointer-events:auto}
  .doc{background:#fff;border:2px solid var(--sg-ink);border-radius:999px;padding:8px 16px;font-weight:700;font-size:14px;box-shadow:4px 4px 0 var(--sg-ink);display:flex;align-items:center;gap:8px}
  .doc [contenteditable]{outline:none;min-width:40px}
  .doc .saved{font-size:11px;font-weight:600;color:var(--muted)}
  .spacer{flex:1}
  button{font:700 13px Poppins,system-ui,sans-serif;background:#fff;color:var(--sg-ink);border:2px solid var(--sg-ink);border-radius:999px;padding:8px 14px;cursor:pointer;box-shadow:4px 4px 0 var(--sg-ink);transition:transform .08s,box-shadow .08s;display:inline-flex;align-items:center;gap:6px}
  button:hover{background:var(--sg-cream)}
  button:active{transform:translate(3px,3px);box-shadow:1px 1px 0 var(--sg-ink)}
  button.dark{background:var(--sg-ink);color:#fff} button.dark:hover{background:#333}
  button.danger{color:var(--sg-red)}
  button.armed{background:var(--sg-red);color:#fff}
  .status{position:absolute;left:16px;bottom:16px;display:flex;gap:6px;flex-wrap:wrap}
  .chip{display:flex;align-items:center;gap:7px;background:#fff;border:2px solid var(--sg-ink);border-radius:999px;padding:7px 12px;font-size:12px;font-weight:700;box-shadow:3px 3px 0 var(--sg-ink)}
  .chip i{width:9px;height:9px;border-radius:50%;background:#bbb}
  .chip.on i{background:var(--ok);box-shadow:0 0 0 3px #c9f0da}
  .inspector{position:absolute;right:16px;top:74px;width:270px;max-height:calc(100% - 140px);overflow-y:auto;background:#fff;border:2px solid var(--sg-ink);border-radius:18px;box-shadow:6px 6px 0 var(--sg-ink);padding:14px 16px;transition:opacity .15s,transform .15s}
  .inspector.hide{opacity:0;transform:translateY(-6px);pointer-events:none}
  .inspector .k{font-size:10px;font-weight:800;letter-spacing:.2em;color:var(--sg-red);text-transform:uppercase}
  .inspector h3{margin:2px 0 10px;font-size:18px;font-weight:800;line-height:1.15}
  .row{display:flex;justify-content:space-between;gap:10px;font-size:12px;padding:6px 0;border-top:1.5px dashed #e5ddd2}
  .row span:first-child{color:var(--muted)} .row span:last-child{font-weight:600;text-align:right}
  .row .ok{color:var(--ok)}
  .inspector .btns{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
  .inspector .btns button{font-size:12px;padding:6px 11px;box-shadow:3px 3px 0 var(--sg-ink)}
  .ctl{border-top:1.5px dashed #e5ddd2;padding:8px 0 2px;font-size:12px}
  .ctl-h{display:flex;justify-content:space-between;color:var(--muted)} .ctl-h b{color:var(--sg-ink)}
  .ctl input[type=range]{width:100%;accent-color:var(--sg-red);margin:8px 0 4px;cursor:pointer}
  .ctl small{display:block;color:var(--muted);font-size:11px}
  .ctl select{width:100%;margin:6px 0 4px;font:600 12px Poppins,sans-serif;border:2px solid var(--sg-ink);border-radius:10px;padding:5px 8px;background:#fff;color:var(--sg-ink);cursor:pointer}
  .ctl select:disabled,.ctl input:disabled{opacity:.5;cursor:not-allowed}
  /* buzzer piano: C4 to C5, neo-brutal keys */
  .piano{position:relative;display:grid;grid-template-columns:repeat(8,1fr);height:92px;margin:10px 2px 6px;border:2px solid var(--sg-ink);border-radius:8px;overflow:hidden;box-shadow:4px 4px 0 var(--sg-ink);background:var(--sg-ink);gap:2px;touch-action:none;user-select:none}
  .piano button{all:unset;cursor:pointer;background:#FFFDF8;display:flex;align-items:flex-end;justify-content:center;padding-bottom:6px;font:700 10px Poppins,sans-serif;color:#a39686;transition:background .05s}
  .piano button:hover{background:#FFF2DF}
  .piano button.hit{background:var(--sg-red);color:#fff}
  .piano .blk{position:absolute;top:0;width:12px;height:54px;background:var(--sg-ink);border-radius:0 0 4px 4px;padding:0;z-index:1;box-shadow:inset 0 -4px 0 #000}
  .piano .blk:hover{background:#333}
  .piano .blk.hit{background:var(--sg-red-deep, #A30A12)}
  .pad{display:grid;grid-template-columns:1fr 1fr 1.6fr 1.6fr;gap:6px;margin-top:10px}
  .pad button{justify-content:center;padding:6px 0;font-size:12px;box-shadow:3px 3px 0 var(--sg-ink)}
  .keys{display:grid;grid-template-columns:repeat(6,1fr);gap:5px;margin:8px 0 6px}
  .keys button{justify-content:center;padding:5px 0;font-size:12px;box-shadow:2px 2px 0 var(--sg-ink)}
  .keys .w2{grid-column:span 2}
  /* IR remote: a handheld 17-key kit remote, styled to match the one in the scene */
  .remote{width:156px;margin:12px auto 10px;padding:14px 14px 20px;background:linear-gradient(160deg,#3a3a3f 0%,#2B2B2E 45%,#202023 100%);border:2px solid var(--sg-ink);border-radius:34px 34px 26px 26px;box-shadow:5px 5px 0 var(--sg-ink),inset 0 2px 0 rgba(255,255,255,.12),inset 0 -3px 0 rgba(0,0,0,.35);position:relative}
  .remote .ir-led{width:22px;height:12px;margin:0 auto 4px;border-radius:12px 12px 4px 4px;background:radial-gradient(circle at 50% 35%,#7a1a1a,#2a0606 70%);border:1.5px solid #111;transition:box-shadow .05s,background .05s}
  .remote.tx .ir-led{background:radial-gradient(circle at 50% 35%,#ffd0d0,#ff2a2a 55%,#a00 100%);box-shadow:0 0 10px 3px rgba(255,50,50,.85),0 -8px 18px 4px rgba(255,60,60,.45)}
  .remote .grille{display:flex;justify-content:center;gap:4px;margin:0 0 12px}
  .remote .grille i{width:4px;height:4px;border-radius:50%;background:#18181a;box-shadow:inset 0 1px 0 rgba(0,0,0,.6),0 1px 0 rgba(255,255,255,.08)}
  .remote .dpad{position:relative;width:118px;height:118px;margin:0 auto 14px;border-radius:50%;background:radial-gradient(circle,#4a4a50 0%,#3e3e44 70%,#353539 100%);box-shadow:inset 0 2px 0 rgba(255,255,255,.12),inset 0 -3px 4px rgba(0,0,0,.4),0 2px 0 #111}
  .remote button{all:unset;box-sizing:border-box;display:grid;place-items:center;cursor:pointer;color:#f2f2f2;font:700 14px Poppins,system-ui,sans-serif;-webkit-tap-highlight-color:transparent;transition:transform .06s,box-shadow .06s,background .06s}
  .remote button:focus-visible{outline:2px solid var(--sg-module);outline-offset:2px}
  .remote .dpad button{position:absolute;width:36px;height:36px;font-size:12px;border-radius:50%;color:#d9d9de}
  .remote .dpad button:hover{color:#fff;background:rgba(255,255,255,.06)}
  .remote .dpad button:active,.remote .dpad button.hit{background:rgba(255,255,255,.12);transform:scale(.92)}
  .remote .dpad .up{top:3px;left:41px} .remote .dpad .down{bottom:3px;left:41px}
  .remote .dpad .left{left:3px;top:41px} .remote .dpad .right{right:3px;top:41px}
  .remote .dpad .ok{width:46px;height:46px;top:36px;left:36px;background:radial-gradient(circle at 40% 30%,#ff4a50,var(--sg-red) 55%,var(--sg-red-deep));color:#fff;font-size:13px;letter-spacing:.04em;box-shadow:0 3px 0 #5a0408,inset 0 2px 0 rgba(255,255,255,.3)}
  .remote .dpad .ok:hover{background:radial-gradient(circle at 40% 30%,#ff6a70,var(--sg-red) 55%,var(--sg-red-deep))}
  .remote .dpad .ok:active,.remote .dpad .ok.hit{transform:translateY(2px);box-shadow:0 1px 0 #5a0408,inset 0 2px 3px rgba(0,0,0,.3)}
  .remote .num{display:grid;grid-template-columns:repeat(3,36px);justify-content:center;gap:9px 12px}
  .remote .num button{width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 40% 30%,#5c5c63,#45454b 60%,#3a3a40);box-shadow:0 3px 0 #141416,inset 0 1px 0 rgba(255,255,255,.18)}
  .remote .num button:hover{background:radial-gradient(circle at 40% 30%,#6a6a72,#4e4e55 60%,#404047)}
  .remote .num button:active,.remote .num button.hit{transform:translateY(2px);box-shadow:0 1px 0 #141416,inset 0 2px 3px rgba(0,0,0,.35)}
  .remote .num .sym{font-size:16px;color:#c9c9cf}
  .empty{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;transition:opacity .25s}
  .empty.hide{opacity:0}
  .empty .box{background:rgba(255,255,255,.96);border:3px dashed var(--sg-ink);border-radius:24px;padding:26px 30px;text-align:center;max-width:380px}
  .empty .box b{display:block;font-size:22px;font-weight:900;margin:8px 0 4px}
  .empty .box p{margin:0;font-size:13px;color:var(--muted)}
  .empty .arrow{font-size:30px;animation:nudge 1.2s ease-in-out infinite}
  @keyframes nudge{50%{transform:translateX(-10px)}}
  .toast{position:absolute;left:50%;bottom:20px;transform:translate(-50%,10px);opacity:0;pointer-events:none;background:var(--sg-ink);color:#fff;border-radius:999px;padding:10px 18px;font-size:13px;font-weight:600;transition:.2s;white-space:nowrap}
  .toast.show{opacity:1;transform:translate(-50%,0)}
  .dragchip{position:fixed;z-index:50;pointer-events:none;display:flex;align-items:center;gap:8px;background:#fff;border:2px solid var(--sg-ink);border-radius:14px;padding:6px 12px 6px 6px;box-shadow:5px 5px 0 var(--sg-ink);transform:translate(-50%,-50%) rotate(-4deg);font-size:13px;font-weight:700}
  .dragchip img{width:40px;height:40px;object-fit:contain;background:var(--sg-cream);border-radius:8px}
  main.drop-target::after{content:"";position:absolute;inset:8px;border:3px dashed rgba(255,242,223,.9);border-radius:18px;pointer-events:none}
  /* ---------- code panel ---------- */
  .fab{position:absolute;right:16px;bottom:16px;z-index:7;padding:10px 16px;font-size:14px;background:var(--sg-ink);color:#fff}
  .fab:hover{background:#333} .fab.on{background:var(--sg-red)}
  .codep{position:absolute;right:16px;top:74px;bottom:76px;width:440px;max-width:calc(100% - 32px);z-index:6;background:#fff;border:2px solid var(--sg-ink);border-radius:18px;box-shadow:6px 6px 0 var(--sg-ink);display:flex;flex-direction:column;overflow:hidden;transition:opacity .15s,transform .15s}
  .codep.hide{opacity:0;transform:translateY(8px);pointer-events:none}
  .codep header{display:flex;align-items:center;gap:10px;padding:10px 12px 10px 16px;border-bottom:2px solid var(--sg-ink);background:var(--sg-cream)}
  .codep header b{font-size:16px;font-weight:800}
  .ce-board{flex:1;min-width:0;font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ce-board select,.ce-bar select{font:600 12px Poppins,sans-serif;border:2px solid var(--sg-ink);border-radius:10px;padding:4px 8px;background:#fff;max-width:100%;cursor:pointer}
  .codep header .x{padding:4px 10px;box-shadow:2px 2px 0 var(--sg-ink)}
  .ce-main{flex:1;min-height:0;display:flex;flex-direction:column} .ce-main[hidden],.ce-empty[hidden]{display:none}
  .ce-bar{display:flex;gap:8px;align-items:center;padding:10px 12px}
  .ce-bar select{flex:1;min-width:0;text-overflow:ellipsis}
  .ce-bar button{padding:6px 12px;font-size:12px;box-shadow:3px 3px 0 var(--sg-ink);white-space:nowrap;flex:none}
  .ce-bar button:disabled{opacity:.45;cursor:default;box-shadow:none;transform:none}
  .ce-bar .run{background:var(--ok);color:#fff} .ce-bar .run:hover{background:#13864a}
  .ce-wrap{flex:1;min-height:110px;display:flex;margin:0 12px;border:2px solid var(--sg-ink);border-radius:12px;overflow:hidden;background:#FFFCF7}
  .ce-gut{width:36px;flex:none;background:#F3ECE2;color:#a39686;font:12px/20px ui-monospace,Consolas,monospace;text-align:right;padding:10px 7px 10px 0;overflow:hidden;user-select:none;white-space:pre}
  .ce-area{position:relative;flex:1;min-width:0;overflow:hidden}
  .ce-area pre,.ce-area textarea{position:absolute;inset:0;margin:0;padding:10px 12px;font:13px/20px ui-monospace,Consolas,monospace;white-space:pre;tab-size:4;border:0;letter-spacing:0;box-sizing:border-box}
  .ce-area pre{pointer-events:none;color:var(--sg-ink);overflow:hidden}
  .ce-area textarea{width:100%;height:100%;background:transparent;color:transparent;caret-color:var(--sg-ink);resize:none;outline:none;overflow:auto}
  .ce-area textarea::selection{background:rgba(228,18,27,.2);color:transparent}
  .ce-line{position:absolute;left:0;right:0;height:20px;background:rgba(24,160,88,.18);display:none}
  .ce-line.err{background:rgba(228,18,27,.18)}
  .c-kw{color:#B30912;font-weight:700} .c-str{color:#1F7A55} .c-num{color:#1D5BB0} .c-com{color:#9a8f83;font-style:italic} .c-api{color:#C2570C;font-weight:700}
  .ce-ref{display:flex;flex-wrap:wrap;gap:5px;padding:8px 12px 0}
  .ce-ref button{font:600 11px ui-monospace,Consolas,monospace;padding:3px 8px;border-width:1.5px;box-shadow:2px 2px 0 var(--sg-ink)}
  .ce-ref button.off{opacity:.4;box-shadow:none;border-style:dashed}
  .ce-out{height:92px;flex:none;margin:8px 12px 0;padding:8px 10px;background:#141414;color:#E9F5EC;border-radius:10px;font:12px/17px ui-monospace,Consolas,monospace;overflow:auto;white-space:pre-wrap}
  .ce-out .err{color:#FF9A9A} .ce-out .dim{color:#8a8a8a}
  .ce-status{padding:8px 14px 10px;font-size:12px;font-weight:600;color:var(--muted)}
  .ce-status .ok{color:var(--ok)} .ce-status .bad{color:var(--sg-red)}
  .ce-empty{flex:1;display:grid;place-items:center;text-align:center;padding:24px 30px}
  .ce-empty b{display:block;font-size:19px;font-weight:900;margin:10px 0 6px}
  .ce-empty p{margin:0 0 16px;font-size:13px;color:var(--muted)}
  body.coding .inspector{right:472px}
  .item.flash{animation:flash 0.5s ease-in-out 3}
  @keyframes flash{50%{background:var(--sg-cream);transform:translate(-2px,-2px);box-shadow:6px 6px 0 var(--sg-red)}}
  @media (max-width:820px){ :root{--side-w:240px} .inspector{width:220px} .item span{display:none} .side-foot{display:none} }
`;
export default styles;
