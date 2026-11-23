// The simulator stylesheet. Edit this file directly.
// Chrome (app bar, sidebar, panels) is flat and quiet so the 3D table stays the focus:
// hairline borders, soft shadows, brand red kept for accents and the stage itself.
const styles = `  :root{
    --sg-red:#E4121B; --sg-red-deep:#B30912; --sg-cream:#FFF2DF; --sg-ink:#1a1a1a; --sg-blush:#FAE3D1;
    --sg-module:#FF8044; --ok:#18A058; --muted:#6f6860; --faint:#9c958c;
    --surface:#ffffff; --surface-2:#f7f5f2; --hover:#f2efea; --line:#e7e3dd; --line-2:#d9d4cc;
    --side-w:264px; --bar-h:52px; --r:10px;
    --shadow-sm:0 1px 2px rgba(17,17,17,.06);
    --shadow:0 1px 2px rgba(17,17,17,.06),0 6px 20px rgba(17,17,17,.10);
    --shadow-lg:0 2px 4px rgba(17,17,17,.06),0 16px 40px rgba(17,17,17,.16);
  }
  *{box-sizing:border-box}
  html,body{margin:0;height:100%;overflow:hidden;background:var(--sg-red);font-family:Poppins,system-ui,sans-serif;color:var(--sg-ink);-webkit-font-smoothing:antialiased}
  .app{display:flex;flex-direction:column;height:100vh}

  /* ---------- buttons ---------- */
  button{font:500 13px Poppins,system-ui,sans-serif;background:var(--surface);color:var(--sg-ink);border:1px solid var(--line-2);border-radius:8px;padding:6px 12px;cursor:pointer;box-shadow:var(--shadow-sm);transition:background .12s,border-color .12s,color .12s;display:inline-flex;align-items:center;gap:6px;line-height:20px}
  button:hover{background:var(--hover)}
  button:active{background:#ebe7e1}
  button:focus-visible,summary:focus-visible{outline:2px solid var(--sg-red);outline-offset:2px}
  button.dark{background:var(--sg-ink);color:#fff;border-color:var(--sg-ink)} button.dark:hover{background:#333}
  button.danger{color:var(--sg-red-deep)}
  button.armed{background:var(--sg-red);border-color:var(--sg-red);color:#fff}
  button.ghost{background:transparent;border-color:transparent;box-shadow:none;color:#3d3833}
  button.ghost:hover{background:var(--hover)}
  button.ghost.danger{color:var(--sg-red-deep)}
  button.ghost.armed{background:var(--sg-red);color:#fff}
  .icon-btn{width:34px;height:34px;padding:0;justify-content:center;background:transparent;border:1px solid transparent;box-shadow:none;border-radius:8px;color:#3d3833;display:inline-flex;align-items:center;cursor:pointer}
  .icon-btn:hover{background:var(--hover)}

  /* ---------- app bar ---------- */
  .appbar{height:var(--bar-h);flex:none;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 10px 0 8px;background:var(--surface);border-bottom:1px solid var(--line);z-index:8;user-select:none}
  .ab-group{display:flex;align-items:center;gap:6px;min-width:0}
  .sep{width:1px;height:22px;background:var(--line);margin:0 6px;flex:none}
  .brand{display:flex;align-items:center;gap:8px;padding:0 4px}
  .mark{width:22px;height:22px;border-radius:6px;background:var(--sg-red);display:grid;grid-template-columns:1fr 1fr;gap:3px;padding:5px;flex:none}
  .mark i{background:var(--sg-cream);border-radius:50%}
  .wordmark{font-weight:800;font-size:16px;letter-spacing:-.02em}
  .beta{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--sg-red-deep);background:#fdeceb;border-radius:5px;padding:2px 6px}
  .doc{display:flex;align-items:center;gap:8px;min-width:0;font-size:13.5px;font-weight:500}
  .doc [contenteditable]{outline:none;min-width:40px;padding:4px 6px;border-radius:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:280px}
  .doc [contenteditable]:hover{background:var(--hover)}
  .doc [contenteditable]:focus{background:var(--surface);box-shadow:0 0 0 2px #f5b8bb}
  .doc .saved{font-size:11px;font-weight:500;color:var(--muted);border:1px solid var(--line);border-radius:5px;padding:1px 6px;display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
  .doc .saved:empty{display:none}
  .doc .saved::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--faint)}
  .doc .saved[data-s=saved]::before{background:var(--ok)}
  .doc .saved[data-s=saving]::before{background:var(--sg-module);animation:sg-pulse .8s ease-in-out infinite alternate}
  .doc .saved[data-s=dirty]::before{background:var(--sg-module)}
  .doc .saved[data-s=error]{color:var(--sg-red-deep);border-color:#f5b8bb} .doc .saved[data-s=error]::before{background:var(--sg-red)}
  .doc .saved[data-s=guest]{cursor:pointer} .doc .saved[data-s=guest]:hover{background:var(--hover)}
  @keyframes sg-pulse{to{opacity:.3}}
  #saveBtn.done{color:var(--ok)}
  .acct{position:relative;display:flex;align-items:center;margin-left:4px}
  .acct-btn{width:34px;height:34px;padding:0;border-radius:50%;overflow:hidden;justify-content:center;background:var(--sg-ink);color:#fff;border:2px solid var(--surface);box-shadow:0 0 0 1px var(--line-2);font:600 12.5px Poppins,system-ui,sans-serif}
  .acct-btn:hover{background:#333;box-shadow:0 0 0 2px var(--sg-red)}
  .acct-btn img{width:100%;height:100%;object-fit:cover;display:block}
  .acct-menu{position:absolute;right:0;top:calc(100% + 8px);width:230px;background:var(--surface);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow-lg);padding:6px;z-index:30}
  .acct-who{padding:8px 10px 10px;border-bottom:1px solid var(--line);margin-bottom:6px;line-height:1.3}
  .acct-who b{display:block;font-size:13.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis} .acct-who span{font-size:12px;color:var(--muted)}
  .acct-menu a,.acct-menu button{display:flex;width:100%;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;border:0;background:none;box-shadow:none;font:500 13px Poppins,system-ui,sans-serif;color:var(--sg-ink);text-decoration:none;cursor:pointer;text-align:left}
  .acct-menu a:hover,.acct-menu button:hover{background:var(--hover)}
  .acct-menu .out{color:var(--sg-red-deep)}
  .signin{background:var(--sg-red);color:#fff;border-color:var(--sg-red);font-weight:600}
  .signin:hover{background:var(--sg-red-deep)}
  .sg-modal{position:fixed;inset:0;z-index:50;display:grid;place-items:center;background:rgba(17,17,17,.35);padding:16px}
  .sg-modal .card{width:min(400px,100%);background:var(--surface);border-radius:14px;box-shadow:var(--shadow-lg);padding:20px}
  .sg-modal h3{margin:0 0 6px;font-size:17px} .sg-modal p{margin:0 0 16px;font-size:13.5px;color:var(--muted);line-height:1.5}
  .sg-modal .row{display:flex;gap:8px;justify-content:flex-end}
  .fab{background:var(--sg-ink);color:#fff;border-color:var(--sg-ink);font-weight:600;padding:6px 14px}
  .fab:hover{background:#333} .fab.on{background:var(--sg-red);border-color:var(--sg-red)}

  /* shortcuts popover */
  .help{position:relative}
  .help summary{list-style:none} .help summary::-webkit-details-marker{display:none}
  .help[open] summary{background:var(--hover)}
  .help-pop{position:absolute;right:0;top:calc(100% + 8px);width:290px;background:var(--surface);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow-lg);padding:12px 14px;z-index:20}
  .help-h{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--faint);margin-bottom:8px}
  .help-grid{display:grid;grid-template-columns:1fr auto;gap:8px 12px;align-items:center;font-size:12.5px;color:#3d3833}
  kbd{font:600 10.5px ui-monospace,SFMono-Regular,Consolas,monospace;border:1px solid var(--line-2);border-bottom-width:2px;border-radius:5px;padding:1px 6px;color:var(--sg-ink);background:var(--surface-2);justify-self:end;white-space:nowrap}

  /* ---------- workspace ---------- */
  .workspace{flex:1;min-height:0;display:flex}

  /* ---------- side nav ---------- */
  aside{width:var(--side-w);flex:none;display:flex;flex-direction:column;background:var(--surface);border-right:1px solid var(--line);z-index:5;user-select:none}
  .aside-h{padding:14px 12px 8px;display:flex;flex-direction:column;gap:10px}
  .aside-h>span{font-size:13px;font-weight:600;padding:0 2px}
  .search{position:relative;color:var(--faint)}
  .search input{width:100%;font:400 13px Poppins,sans-serif;padding:7px 10px 7px 32px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2);outline:none;color:var(--sg-ink);transition:border-color .12s,box-shadow .12s,background .12s}
  .search input::placeholder{color:var(--faint)}
  .search input:focus{background:var(--surface);border-color:#f0a3a7;box-shadow:0 0 0 3px #fde3e4}
  .search svg{position:absolute;left:10px;top:50%;transform:translateY(-50%)}
  .lib{flex:1;overflow-y:auto;padding:0 8px 12px;scrollbar-width:thin;scrollbar-color:#ddd8d0 transparent}
  .lib::-webkit-scrollbar{width:8px}.lib::-webkit-scrollbar-thumb{background:#e2ddd5;border-radius:8px}
  .cat{margin-top:6px}
  .cat-h{display:flex;align-items:center;gap:6px;cursor:pointer;padding:8px 6px 6px;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--faint);border-radius:6px}
  .cat-h:hover{color:var(--sg-ink)}
  .cat-h .chev{transition:transform .2s;opacity:.6}
  .cat-h .chev path{stroke:currentColor}
  .cat-h .n{margin-left:auto;font-size:11px;font-weight:500;letter-spacing:0;color:var(--faint)}
  .cat.closed .chev{transform:rotate(-90deg)} .cat.closed .items{display:none}
  .items{display:flex;flex-direction:column;gap:2px}
  .item{display:flex;align-items:center;gap:10px;padding:6px;border:1px solid transparent;border-radius:var(--r);background:transparent;cursor:grab;transition:background .12s,border-color .12s;touch-action:none}
  .item:hover{background:var(--surface-2);border-color:var(--line)}
  .item:active{cursor:grabbing;background:var(--hover)}
  .item .th{width:40px;height:40px;flex:none;border-radius:8px;background:var(--sg-cream);display:grid;place-items:center;overflow:hidden}
  .item .th img{width:100%;height:100%;object-fit:contain;pointer-events:none}
  .item .tx{min-width:0;flex:1}
  .item b{display:block;font-size:13px;font-weight:500;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .item .tx span{font-size:11.5px;color:var(--muted);line-height:1.35;margin-top:1px;overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2}
  .item .grip{flex:none;opacity:0;transition:opacity .12s;fill:var(--faint)}
  .item:hover .grip{opacity:1}
  .item.soon{cursor:not-allowed}
  .item.soon .th,.item.soon .tx{opacity:.5}
  .item.soon:hover{background:transparent;border-color:transparent}
  .pill{flex:none;font-size:10px;font-weight:500;letter-spacing:.02em;border-radius:5px;padding:1px 6px;background:var(--surface-2);border:1px solid var(--line);color:var(--muted)}
  .pill.live{background:var(--ok);color:#fff}
  .side-foot{border-top:1px solid var(--line);padding:10px 14px;font-size:11.5px;color:var(--faint)}

  /* ---------- stage ---------- */
  main{position:relative;flex:1;min-width:0}
  #c{display:block;width:100%;height:100%;touch-action:none;outline:none}
  .status{position:absolute;left:12px;bottom:12px;display:flex;align-items:center;background:rgba(255,255,255,.94);backdrop-filter:blur(8px);border:1px solid var(--line);border-radius:9px;box-shadow:var(--shadow);padding:0 4px;height:32px}
  .status:empty{display:none}
  .chip{display:flex;align-items:center;gap:6px;padding:0 9px;font-size:12px;font-weight:500;color:#3d3833;white-space:nowrap}
  .chip+.chip{border-left:1px solid var(--line)}
  .chip i{width:7px;height:7px;border-radius:50%;background:#c8c2b9}
  .chip.on i{background:var(--ok);box-shadow:0 0 0 3px #d6f2e2}

  /* floating panels: inspector + code */
  .inspector{position:absolute;right:12px;top:12px;width:280px;max-height:calc(100% - 24px);overflow-y:auto;background:var(--surface);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow-lg);padding:14px 16px;transition:opacity .15s,transform .15s;scrollbar-width:thin}
  .inspector.hide{opacity:0;transform:translateY(-6px);pointer-events:none}
  .inspector .k{font-size:11px;font-weight:600;letter-spacing:.06em;color:var(--sg-red-deep);text-transform:uppercase}
  .inspector h3{margin:2px 0 10px;font-size:17px;font-weight:600;line-height:1.2;letter-spacing:-.01em}
  .row{display:flex;justify-content:space-between;gap:10px;font-size:12.5px;padding:7px 0;border-top:1px solid var(--line)}
  .row span:first-child{color:var(--muted)} .row span:last-child{font-weight:500;text-align:right}
  .row .ok{color:var(--ok)}
  .inspector .btns{display:flex;gap:6px;margin-top:12px;flex-wrap:wrap;padding-top:12px;border-top:1px solid var(--line)}
  .inspector .btns button{font-size:12px;padding:4px 10px}
  .inspector .btns kbd{margin-left:2px}
  .ctl{border-top:1px solid var(--line);padding:8px 0 4px;font-size:12.5px}
  .ctl-h{display:flex;justify-content:space-between;color:var(--muted)} .ctl-h b{color:var(--sg-ink);font-weight:600}
  .ctl input[type=range]{width:100%;accent-color:var(--sg-red);margin:8px 0 4px;cursor:pointer}
  .ctl small{display:block;color:var(--muted);font-size:11.5px}
  .ctl select{width:100%;margin:6px 0 4px;font:500 12.5px Poppins,sans-serif;border:1px solid var(--line-2);border-radius:8px;padding:5px 8px;background:var(--surface);color:var(--sg-ink);cursor:pointer}
  .ctl select:disabled,.ctl input:disabled{opacity:.5;cursor:not-allowed}
  /* buzzer piano: C4 to C5 */
  .piano{position:relative;display:grid;grid-template-columns:repeat(8,1fr);height:92px;margin:10px 0 6px;border:1px solid var(--sg-ink);border-radius:8px;overflow:hidden;box-shadow:var(--shadow);background:var(--sg-ink);gap:1px;touch-action:none;user-select:none}
  .piano button{all:unset;cursor:pointer;background:#FFFDF8;display:flex;align-items:flex-end;justify-content:center;padding-bottom:6px;font:600 10px Poppins,sans-serif;color:#a39686;transition:background .05s}
  .piano button:hover{background:#FFF2DF}
  .piano button.hit{background:var(--sg-red);color:#fff}
  .piano .blk{position:absolute;top:0;width:12px;height:54px;background:var(--sg-ink);border-radius:0 0 4px 4px;padding:0;z-index:1;box-shadow:inset 0 -4px 0 #000}
  .piano .blk:hover{background:#333}
  .piano .blk.hit{background:var(--sg-red-deep, #A30A12)}
  .pad{display:grid;grid-template-columns:1fr 1fr 1.6fr 1.6fr;gap:6px;margin-top:10px}
  .pad button{justify-content:center;padding:5px 0;font-size:12px}
  .keys{display:grid;grid-template-columns:repeat(6,1fr);gap:5px;margin:8px 0 6px}
  .keys button{justify-content:center;padding:4px 0;font-size:12px}
  .keys .w2{grid-column:span 2}
  /* IR remote: a handheld 17-key kit remote, styled to match the one in the scene */
  .remote{width:156px;margin:12px auto 10px;padding:14px 14px 20px;background:linear-gradient(160deg,#3a3a3f 0%,#2B2B2E 45%,#202023 100%);border:1px solid #111;border-radius:34px 34px 26px 26px;box-shadow:var(--shadow-lg),inset 0 2px 0 rgba(255,255,255,.12),inset 0 -3px 0 rgba(0,0,0,.35);position:relative}
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
  .empty .box{background:var(--surface);border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow-lg);padding:24px 28px;text-align:center;max-width:360px}
  .empty .box b{display:block;font-size:18px;font-weight:600;margin:6px 0 6px;letter-spacing:-.01em}
  .empty .box p{margin:0;font-size:13px;line-height:1.55;color:var(--muted)}
  .empty .box strong{color:var(--sg-ink);font-weight:600}
  .empty .arrow{display:inline-grid;place-items:center;width:34px;height:34px;border-radius:50%;background:#fdeceb;color:var(--sg-red-deep);font-size:18px;animation:nudge 1.2s ease-in-out infinite}
  @keyframes nudge{50%{transform:translateX(-8px)}}
  .toast{position:absolute;left:50%;bottom:16px;transform:translate(-50%,10px);opacity:0;pointer-events:none;background:var(--sg-ink);color:#fff;border-radius:9px;padding:9px 16px;font-size:13px;font-weight:500;box-shadow:var(--shadow-lg);transition:.2s;white-space:nowrap}
  .toast.show{opacity:1;transform:translate(-50%,0)}
  .dragchip{position:fixed;z-index:50;pointer-events:none;display:flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:5px 12px 5px 5px;box-shadow:var(--shadow-lg);transform:translate(-50%,-50%) rotate(-2deg);font-size:13px;font-weight:500}
  .dragchip img{width:34px;height:34px;object-fit:contain;background:var(--sg-cream);border-radius:7px}
  main.drop-target::after{content:"";position:absolute;inset:10px;border:2px dashed rgba(255,242,223,.85);border-radius:14px;pointer-events:none}

  /* ---------- code panel ---------- */
  .codep{position:absolute;right:12px;top:12px;bottom:12px;width:460px;max-width:calc(100% - 24px);z-index:6;background:var(--surface);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow-lg);display:flex;flex-direction:column;overflow:hidden;transition:opacity .15s,transform .15s}
  .codep.hide{opacity:0;transform:translateY(8px);pointer-events:none}
  .codep header{display:flex;align-items:center;gap:10px;padding:8px 8px 8px 16px;border-bottom:1px solid var(--line);background:var(--surface)}
  .codep header b{font-size:14px;font-weight:600}
  .ce-board{flex:1;min-width:0;font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ce-board select,.ce-bar select{font:500 12.5px Poppins,sans-serif;border:1px solid var(--line-2);border-radius:8px;padding:5px 8px;background:var(--surface);color:var(--sg-ink);max-width:100%;cursor:pointer}
  .codep header .x{width:30px;height:30px;padding:0;justify-content:center;background:transparent;border-color:transparent;box-shadow:none;color:var(--muted)}
  .codep header .x:hover{background:var(--hover);color:var(--sg-ink)}
  .ce-main{flex:1;min-height:0;display:flex;flex-direction:column} .ce-main[hidden],.ce-empty[hidden]{display:none}
  .ce-bar{display:flex;gap:6px;align-items:center;padding:10px 12px}
  .ce-bar select{flex:1;min-width:0;text-overflow:ellipsis}
  .ce-bar button{padding:5px 12px;font-size:12.5px;white-space:nowrap;flex:none}
  .ce-bar button:disabled{opacity:.45;cursor:default}
  .ce-bar .run{background:var(--ok);border-color:var(--ok);color:#fff;font-weight:600} .ce-bar .run:hover{background:#13864a}
  .ce-wrap{flex:1;min-height:140px;display:flex;margin:0 12px;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:#FFFCF7}
  .ce-gut{width:38px;flex:none;background:#f6f1ea;border-right:1px solid var(--line);color:#b0a597;font:12px/20px ui-monospace,Consolas,monospace;text-align:right;padding:10px 8px 10px 0;overflow:hidden;user-select:none;white-space:pre}
  .ce-area{position:relative;flex:1;min-width:0;overflow:hidden}
  .ce-area pre,.ce-area textarea{position:absolute;inset:0;margin:0;padding:10px 12px;font:13px/20px ui-monospace,Consolas,monospace;white-space:pre;tab-size:4;border:0;letter-spacing:0;box-sizing:border-box}
  .ce-area pre{pointer-events:none;color:var(--sg-ink);overflow:hidden}
  .ce-area textarea{width:100%;height:100%;background:transparent;color:transparent;caret-color:var(--sg-ink);resize:none;outline:none;overflow:auto}
  .ce-area textarea::selection{background:rgba(228,18,27,.2);color:transparent}
  .ce-line{position:absolute;left:0;right:0;height:20px;background:rgba(24,160,88,.16);display:none}
  .ce-line.err{background:rgba(228,18,27,.16)}
  .c-kw{color:#B30912;font-weight:700} .c-str{color:#1F7A55} .c-num{color:#1D5BB0} .c-com{color:#9a8f83;font-style:italic} .c-api{color:#C2570C;font-weight:700}
  .ce-ref{display:flex;flex-wrap:wrap;gap:4px;margin:8px 12px 0;max-height:62px;overflow-y:auto;flex:none;scrollbar-width:thin}
  .ce-ref button{font:500 11px ui-monospace,Consolas,monospace;padding:2px 7px;border-radius:6px;box-shadow:none;background:var(--surface-2);border-color:var(--line);line-height:18px}
  .ce-ref button:hover{background:var(--hover);border-color:var(--line-2)}
  .ce-ref button.off{opacity:.45;border-style:dashed;background:transparent}
  .ce-out{height:96px;flex:none;margin:8px 12px 0;padding:8px 10px;background:#18181a;color:#E9F5EC;border-radius:10px;font:12px/17px ui-monospace,Consolas,monospace;overflow:auto;white-space:pre-wrap}
  .ce-out .err{color:#FF9A9A} .ce-out .dim{color:#8a8a8a}
  .ce-status{padding:8px 14px 10px;font-size:12px;font-weight:500;color:var(--muted)}
  .ce-status .ok{color:var(--ok)} .ce-status .bad{color:var(--sg-red)}
  .ce-empty{flex:1;display:grid;place-items:center;text-align:center;padding:24px 30px}
  .ce-empty b{display:block;font-size:17px;font-weight:600;margin:10px 0 6px}
  .ce-empty p{margin:0 0 16px;font-size:13px;line-height:1.55;color:var(--muted)}
  body.coding .inspector{right:484px}
  .item.flash{animation:flash 0.5s ease-in-out 3}
  @keyframes flash{50%{background:#fdeceb;border-color:#f5b8bb}}

  @media (max-width:980px){ .ab-group .lbl{display:none} .doc .saved{font-size:0;gap:0;padding:4px} }
  @media (max-width:820px){ :root{--side-w:220px} .inspector{width:230px} .item .tx span{display:none} .side-foot{display:none} .beta{display:none} .doc [contenteditable]{max-width:140px} }
`;
export default styles;
