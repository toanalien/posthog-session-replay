import { UrchinReplaySDK } from '../sdk';
import './demo.css';

type FlushLog = {
  at: string;
  ok: boolean;
  count: number;
};

const params = new URLSearchParams(window.location.search);
const endpoint = params.get('endpoint') || window.location.origin;
const projectId = params.get('projectId') || 'default';
const distinctId =
  params.get('distinctId') ||
  localStorage.getItem('urchin_demo_distinct_id') ||
  `demo_user_${Math.random().toString(36).slice(2, 8)}`;

localStorage.setItem('urchin_demo_distinct_id', distinctId);

const sdk = new UrchinReplaySDK({
  endpoint,
  projectId,
  distinctId,
  maskAllInputs: true,
  flushIntervalMs: 3000,
  debug: true,
});

let flushCount = 0;
let lastFlush: FlushLog | null = null;
let recording = false;
const activity: string[] = [];

// Track auto-flushes from the SDK interval by wrapping flush once.
const originalFlush = sdk.flush.bind(sdk);
sdk.flush = async () => {
  const result = await originalFlush();
  if (result.count > 0) {
    flushCount += result.ok ? 1 : 0;
    lastFlush = {
      at: new Date().toLocaleTimeString(),
      ok: result.ok,
      count: result.count,
    };
    log(
      result.ok
        ? `Flush OK — ${result.count} events → Worker`
        : `Flush FAILED — ${result.count} events (re-queued)`
    );
    updateStatus();
    void refreshRemoteSessions();
  }
  return result;
};

function log(msg: string) {
  activity.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`);
  if (activity.length > 14) activity.pop();
  renderActivity();
}

function renderActivity() {
  const el = document.getElementById('activity-log');
  if (!el) return;
  el.innerHTML = activity.map((l) => `<div class="log-line">${escapeHtml(l)}</div>`).join('');
}

function escapeHtml(s: string) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function updateStatus() {
  const sessionEl = document.getElementById('stat-session');
  const distinctEl = document.getElementById('stat-distinct');
  const flushEl = document.getElementById('stat-flushes');
  const lastEl = document.getElementById('stat-last');
  const badgeEl = document.getElementById('rec-badge');
  const endpointEl = document.getElementById('stat-endpoint');

  if (sessionEl) sessionEl.textContent = sdk.getSessionId() || '—';
  if (distinctEl) distinctEl.textContent = distinctId;
  if (flushEl) flushEl.textContent = String(flushCount);
  if (endpointEl) endpointEl.textContent = endpoint;
  if (lastEl) {
    lastEl.textContent = lastFlush
      ? `${lastFlush.ok ? 'OK' : 'FAIL'} · ${lastFlush.count} events · ${lastFlush.at}`
      : 'Waiting for first flush…';
    lastEl.className = lastFlush?.ok === false ? 'stat-value text-rose-400' : 'stat-value';
  }
  if (badgeEl) {
    badgeEl.textContent = recording ? 'RECORDING' : 'STOPPED';
    badgeEl.className = recording ? 'rec-badge live' : 'rec-badge stopped';
  }
}

async function refreshRemoteSessions() {
  const box = document.getElementById('remote-sessions');
  if (!box) return;
  try {
    const res = await fetch(
      `${endpoint.replace(/\/$/, '')}/api/v1/projects/${projectId}/sessions?limit=8`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as {
      sessions?: Array<{
        id: string;
        distinct_id: string;
        event_count?: number;
        duration_seconds?: number;
        browser?: string;
      }>;
    };
    const sessions = data.sessions || [];
    if (sessions.length === 0) {
      box.innerHTML = `<p class="muted">Chưa có session trên Worker. Interact + đợi flush rồi thử lại.</p>`;
      return;
    }
    box.innerHTML = sessions
      .map(
        (s) => `
      <a class="session-row" href="/" target="_blank" rel="noreferrer">
        <div>
          <div class="session-id">${escapeHtml(s.id)}</div>
          <div class="muted">${escapeHtml(s.distinct_id)} · ${s.event_count || 0} events · ${Math.round(s.duration_seconds || 0)}s</div>
        </div>
        <span class="pill">${escapeHtml(s.browser || '—')}</span>
      </a>`
      )
      .join('');
  } catch (err: any) {
    box.innerHTML = `<p class="text-rose-400">Không gọi được API sessions: ${escapeHtml(err?.message || String(err))}. Chạy <code>npm run worker:dev</code>.</p>`;
  }
}

function mount() {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <div class="demo-shell">
      <header class="topbar">
        <div class="brand">
          <div class="brand-mark">U</div>
          <div>
            <div class="brand-title">Urchin Demo Store</div>
            <div class="brand-sub">Live session replay test page</div>
          </div>
        </div>
        <div class="topbar-actions">
          <span id="rec-badge" class="rec-badge stopped">STOPPED</span>
          <a class="btn ghost" href="/" target="_blank" rel="noreferrer">Open Dashboard ↗</a>
        </div>
      </header>

      <div class="layout">
        <main class="store">
          <section class="hero card">
            <p class="eyebrow">Checkout playground</p>
            <h1>Tương tác như user thật — SDK ghi DOM, click, error & network.</h1>
            <p class="lede">Trang này gắn <strong>UrchinReplaySDK</strong> (rrweb). Events flush về Worker mỗi 3s hoặc khi bấm <em>Flush now</em>.</p>
          </section>

          <section class="card form-card">
            <h2>Customer details</h2>
            <div class="grid-2">
              <label>
                <span>Full name</span>
                <input id="name" type="text" placeholder="Alex Nguyen" autocomplete="name" />
              </label>
              <label>
                <span>Email</span>
                <input id="email" type="email" placeholder="alex@company.io" autocomplete="email" />
              </label>
              <label>
                <span>Card number <em>(masked)</em></span>
                <input id="card" class="urchin-mask" type="text" placeholder="4242 4242 4242 4242" />
              </label>
              <label>
                <span>Password <em>(masked)</em></span>
                <input id="password" class="urchin-mask" type="password" placeholder="••••••••" />
              </label>
            </div>
            <div class="actions">
              <button id="btn-pay" class="btn primary" type="button">Pay $49.00</button>
              <button id="btn-rage" class="btn warn" type="button">Rage-click me</button>
              <button id="btn-error" class="btn danger" type="button">Throw JS error</button>
              <button id="btn-fetch" class="btn cyan" type="button">Call fake API</button>
            </div>
            <p id="pay-status" class="muted">Ready to checkout.</p>
          </section>

          <section class="card products">
            <h2>Products</h2>
            <div class="product-grid">
              ${['Nebula Hoodie', 'Orbit Cap', 'Signal Socks']
                .map(
                  (name, i) => `
                <button class="product" data-product="${name}" type="button">
                  <div class="product-art tonality-${i}"></div>
                  <div class="product-name">${name}</div>
                  <div class="muted">Add to cart</div>
                </button>`
                )
                .join('')}
            </div>
          </section>
        </main>

        <aside class="panel">
          <section class="card status-card">
            <h2>SDK status</h2>
            <dl class="stats">
              <div><dt>Endpoint</dt><dd id="stat-endpoint" class="stat-value mono">—</dd></div>
              <div><dt>Session ID</dt><dd id="stat-session" class="stat-value mono">—</dd></div>
              <div><dt>Distinct ID</dt><dd id="stat-distinct" class="stat-value mono">—</dd></div>
              <div><dt>Successful flushes</dt><dd id="stat-flushes" class="stat-value">0</dd></div>
              <div><dt>Last flush</dt><dd id="stat-last" class="stat-value">Waiting…</dd></div>
            </dl>
            <div class="actions tight">
              <button id="btn-start" class="btn primary" type="button">Start</button>
              <button id="btn-stop" class="btn ghost" type="button">Stop</button>
              <button id="btn-flush" class="btn cyan" type="button">Flush now</button>
              <button id="btn-refresh" class="btn ghost" type="button">Refresh sessions</button>
            </div>
          </section>

          <section class="card">
            <h2>Sessions on Worker</h2>
            <div id="remote-sessions" class="session-list">
              <p class="muted">Loading…</p>
            </div>
          </section>

          <section class="card">
            <h2>Activity</h2>
            <div id="activity-log" class="activity"></div>
          </section>
        </aside>
      </div>
    </div>
  `;

  bindEvents();
  startRecording();
  updateStatus();
  void refreshRemoteSessions();
  setInterval(updateStatus, 1000);
  setInterval(() => void refreshRemoteSessions(), 8000);
}

function bindEvents() {
  document.getElementById('btn-start')?.addEventListener('click', () => startRecording());
  document.getElementById('btn-stop')?.addEventListener('click', () => stopRecording());
  document.getElementById('btn-flush')?.addEventListener('click', () => {
    void sdk.flush();
  });
  document.getElementById('btn-refresh')?.addEventListener('click', () => void refreshRemoteSessions());

  document.getElementById('btn-pay')?.addEventListener('click', () => {
    const status = document.getElementById('pay-status');
    if (status) status.textContent = 'Processing payment…';
    log('Clicked Pay $49.00');
    sdk.recordCustomEvent('$checkout_attempt', { amount: 49, currency: 'USD' });
    setTimeout(() => {
      if (status) status.textContent = 'Payment accepted (demo).';
      log('Checkout success custom event');
    }, 600);
  });

  let rageClicks = 0;
  document.getElementById('btn-rage')?.addEventListener('click', () => {
    rageClicks += 1;
    log(`Rage button click #${rageClicks}`);
  });

  document.getElementById('btn-error')?.addEventListener('click', () => {
    log('Throwing console.error for capture');
    console.error(new Error('Demo checkout failure ERR_DEMO_PAYMENT'));
  });

  document.getElementById('btn-fetch')?.addEventListener('click', async () => {
    log('Calling https://jsonplaceholder.typicode.com/todos/1');
    try {
      const res = await fetch('https://jsonplaceholder.typicode.com/todos/1');
      log(`API responded ${res.status}`);
    } catch (err: any) {
      log(`API failed: ${err?.message || err}`);
    }
  });

  document.querySelectorAll<HTMLButtonElement>('.product').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.product || 'item';
      log(`Added product: ${name}`);
      sdk.recordCustomEvent('$add_to_cart', { product: name });
    });
  });
}

function startRecording() {
  if (recording) {
    log('Already recording');
    return;
  }
  sdk.start();
  recording = true;
  log('UrchinReplaySDK started');
  updateStatus();
}

function stopRecording() {
  if (!recording) return;
  sdk.stop();
  recording = false;
  log('UrchinReplaySDK stopped + final flush');
  updateStatus();
  void refreshRemoteSessions();
}

mount();
