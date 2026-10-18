import { createHash, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const accounts = JSON.parse(readFileSync(join(root, 'accounts.json'), 'utf8'));
const receipt = readFileSync(join(root, 'files', 'receipt.txt'));
const users = new Map(accounts.users.map((user) => [user.username, user]));
const sessions = new Map();
const records = new Map();
const port = Number(process.env.DEMO_PORT || 4173);

if (!Number.isInteger(port) || port <= 0) {
  throw new Error('DEMO_PORT must be a positive integer');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function page(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: "Segoe UI", sans-serif; margin: 24px; color: #1b1b1b; background: #ffffff; }
    button, input, select { font: inherit; color: #1b1b1b; background: #ffffff; }
    button { min-height: 44px; padding: 8px 12px; border: 1px solid #1b1b1b; }
    label { display: block; margin: 8px 0; }
    [role="status"], [role="alert"] { min-height: 1.2em; }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(title)}</h1>
    ${body}
  </main>
</body>
</html>`;
}

function sendHtml(res, status, title, body) {
  res.writeHead(status, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(page(title, body));
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 1_000_000) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function cookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return '';
}

function currentUser(req) {
  return sessions.get(cookie(req, 'session')) || null;
}

const loginForm = (message) => `<form method="post" action="/login" aria-label="Sign in">
  <label>Username <input name="username" autocomplete="username" /></label>
  <label>Password <input name="password" type="password" autocomplete="current-password" /></label>
  <button type="submit">Sign in</button>
  <p role="alert">${escapeHtml(message)}</p>
</form>`;

const pages = {
  '/assertions': () => `<button type="button" id="save">Save invoice</button>
    <p role="status" id="status">Not saved</p>
    <script>
      document.getElementById('save').onclick = () => {
        document.getElementById('status').textContent = 'Invoice saved';
      };
    </script>`,
  '/locators': () => `<section aria-label="Draft"><button type="button" id="save-draft">Save</button></section>
    <section aria-label="Send"><button type="button" id="save-send">Save</button></section>
    <label>Email <input name="email" type="email" /></label>
    <p id="ready">Ready to send</p>
    <p id="invoice-total">12.00</p>
    <p role="status" id="status"></p>
    <script>
      document.getElementById('save-draft').onclick = () => {
        document.getElementById('status').textContent = 'Draft saved';
      };
      document.getElementById('save-send').onclick = () => {
        document.getElementById('status').textContent = 'Invoice sent';
      };
    </script>`,
  '/waiting': () => `<button type="button" id="brew" disabled>Brew</button>
    <p role="status" id="status">Waiting</p>
    <script>
      const brew = document.getElementById('brew');
      const status = document.getElementById('status');
      setTimeout(() => {
        brew.disabled = false;
        status.textContent = 'Ready';
      }, 400);
      brew.onclick = () => {
        status.textContent = 'Brewing';
      };
    </script>`,
  '/desk': () => `<label>Note <input id="note" /></label>
    <p role="status">Desk is open</p>`,
  '/notes': () => `<label>Note <input id="note" /></label>`,
  '/forms': () => `<form aria-label="Order">
      <label>Size
        <select name="size">
          <option value="">Choose</option>
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </label>
      <label><input type="checkbox" name="extra" /> Extra shot</label>
      <fieldset>
        <legend>Milk</legend>
        <label><input type="radio" name="milk" value="oat" /> Oat</label>
        <label><input type="radio" name="milk" value="dairy" /> Dairy</label>
      </fieldset>
      <button type="button" id="save-order">Save order</button>
      <p role="alert" id="form-error"></p>
    </form>
    <button type="button" id="notify">Notify the kitchen</button>
    <button type="button" id="clear">Clear the form</button>
    <p role="status" id="status"></p>
    <script>
      document.getElementById('save-order').onclick = () => {
        const size = document.querySelector('select[name="size"]').value;
        document.getElementById('form-error').textContent = size ? '' : 'Choose a size';
        document.getElementById('status').textContent = size ? 'Order saved' : '';
      };
      document.getElementById('notify').onclick = () => {
        window.alert('Kitchen notified');
        document.getElementById('status').textContent = 'Kitchen notified';
      };
      document.getElementById('clear').onclick = () => {
        const accepted = window.confirm('Clear this form?');
        document.getElementById('status').textContent = accepted ? 'Form cleared' : 'Clear cancelled';
      };
    </script>`,
  '/frames': () => `<iframe title="Discount details" src="/frames/inner"></iframe>`,
  '/frames/inner': () => `<button type="button" id="apply">Apply discount</button>
    <p role="status" id="status">No discount</p>
    <script>
      document.getElementById('apply').onclick = () => {
        document.getElementById('status').textContent = 'Discount applied';
      };
    </script>`,
  '/popup': () => `<button type="button" id="open">Open receipt</button>
    <script>
      document.getElementById('open').onclick = () => window.open('/receipt', 'receipt');
    </script>`,
  '/receipt': () => `<p role="status">Paid</p>`,
  '/orders-ui': () => `<p role="status" id="status">Loading orders</p>
    <ul aria-label="Orders" id="list"></ul>
    <script>
      const status = document.getElementById('status');
      const list = document.getElementById('list');
      fetch('/api/orders').then(async (response) => {
        if (!response.ok) {
          status.textContent = 'Orders could not be loaded';
          return;
        }
        const orders = await response.json();
        if (!Array.isArray(orders) || orders.length === 0) {
          status.textContent = 'No orders yet';
          return;
        }
        status.textContent = 'Orders loaded';
        for (const order of orders) {
          const item = document.createElement('li');
          item.textContent = String(order.customer || '');
          list.append(item);
        }
      }).catch(() => {
        status.textContent = 'Orders could not be loaded';
      });
    </script>`,
  '/cards': () => `<ul aria-label="Customers">
      <li><h2>Northwind</h2><p>Open</p><button type="button">View</button></li>
      <li><h2>Contoso</h2><p>Shipped</p><button type="button">View</button></li>
    </ul>
    <p role="status" id="status"></p>
    <script>
      document.querySelectorAll('li').forEach((row) => {
        row.querySelector('button').onclick = () => {
          document.getElementById('status').textContent = 'Viewing ' + row.querySelector('h2').textContent;
        };
      });
    </script>`,
  '/visual': () => `<div data-testid="swatch" style="width:200px;height:80px;background:#112233;"></div>`,
  '/files': () => `<label>Invoice file <input id="file" type="file" /></label>
    <p role="status" id="chosen"></p>
    <p><a href="/files/receipt.txt" download="receipt.txt">Download receipt</a></p>
    <script>
      document.getElementById('file').onchange = () => {
        const file = document.getElementById('file').files[0];
        document.getElementById('chosen').textContent = file ? file.name : '';
      };
    </script>`,
  '/shadow': () => `<coffee-card></coffee-card>
    <script>
      class CoffeeCard extends HTMLElement {
        constructor() {
          super();
          const root = this.attachShadow({ mode: 'open' });
          root.innerHTML = '<button type="button">Brew</button><p role="status">Idle</p>';
          root.querySelector('button').addEventListener('click', () => {
            root.querySelector('[role="status"]').textContent = 'Brewing';
          });
        }
      }
      customElements.define('coffee-card', CoffeeCard);
    </script>`,
  '/records': () => `<button type="button" id="refresh">Refresh</button>
    <ul aria-label="Records" id="list"></ul>
    <p role="status" id="status"></p>
    <script>
      async function loadRecords() {
        const response = await fetch('/api/records');
        const records = await response.json();
        const list = document.getElementById('list');
        list.replaceChildren();
        for (const record of records) {
          const item = document.createElement('li');
          item.textContent = record.name;
          list.append(item);
        }
        document.getElementById('status').textContent = records.length + ' records';
      }
      document.getElementById('refresh').onclick = loadRecords;
      loadRecords();
    </script>`,
  '/order': () => `<form aria-label="Order">
      <label>Customer <input name="customer" /></label>
      <label>Size
        <select name="size">
          <option value="">Choose</option>
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </label>
      <button type="submit">Save order</button>
      <p role="status" id="status"></p>
    </form>
    <script>
      document.querySelector('form').addEventListener('submit', (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const customer = String(data.get('customer') || '').trim();
        document.getElementById('status').textContent = customer ? 'Saved ' + customer : 'Customer is required';
      });
    </script>`,
  '/performance': () => `<p>The order list is ready.</p>`,
  '/browser': () => `<p role="status" id="engine">Unknown</p>
    <script>
      const agent = navigator.userAgent;
      let engine = 'other';
      if (agent.includes('Firefox/')) engine = 'firefox';
      else if (agent.includes('Chrome/')) engine = 'chromium';
      else if (agent.includes('WebKit')) engine = 'webkit';
      document.getElementById('engine').textContent = engine;
    </script>`,
  '/a11y/good': () => `<form aria-label="Contact">
      <label>Email <input name="email" type="email" autocomplete="email" /></label>
      <button type="submit">Send</button>
    </form>`,
  '/a11y/bad': () => `<form aria-label="Contact">
      <input name="email" type="email" />
      <button type="submit">Send</button>
    </form>`,
  '/nav': () => `<p><a href="/nav/next">Open the next page</a></p>`,
  '/nav/next': () => `<p role="status">Arrived</p>`,
  '/nav/slow': () => `<button type="button" id="go">Go to the next page</button>
    <script>
      document.getElementById('go').onclick = () => {
        setTimeout(() => { location.href = '/nav/next'; }, 300);
      };
    </script>`,
  '/details': () => `<label>Customer <input id="customer" value="Northwind" data-kind="name" /></label>
    <ul>
      <li>Alpha</li>
      <li>Beta</li>
      <li>Gamma</li>
    </ul>`,
  '/rows': () => `<ul>
      <li>Northwind <button type="button">View</button></li>
      <li>Contoso <button type="button">View</button></li>
      <li>Fabrikam <button type="button">View</button></li>
    </ul>
    <p role="status" id="status"></p>
    <script>
      document.querySelectorAll('li').forEach((row) => {
        row.querySelector('button').onclick = () => {
          document.getElementById('status').textContent = 'Viewing ' + row.firstChild.textContent.trim();
        };
      });
    </script>`,
  '/keys': () => `<label>Search <input id="search" /></label>
    <p role="status" id="status"></p>
    <script>
      document.getElementById('search').addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          document.getElementById('status').textContent = 'Searched ' + event.currentTarget.value;
        }
      });
    </script>`,
  '/pointer': () => `<button type="button" id="menu">Menu</button>
    <p id="tip" hidden>Open orders</p>
    <div id="ticket" draggable="true" style="display:inline-block;padding:8px;border:1px solid #1b1b1b">Ticket</div>
    <div id="drop" style="min-height:44px;margin-top:12px;border:1px dashed #1b1b1b">Drop here</div>
    <script>
      document.getElementById('menu').addEventListener('mouseenter', () => {
        document.getElementById('tip').hidden = false;
      });
      const ticket = document.getElementById('ticket');
      const drop = document.getElementById('drop');
      ticket.addEventListener('dragstart', (event) => event.dataTransfer.setData('text/plain', 'Ticket'));
      drop.addEventListener('dragover', (event) => event.preventDefault());
      drop.addEventListener('drop', (event) => {
        event.preventDefault();
        drop.textContent = 'Dropped Ticket';
      });
    </script>`,
  '/scroll': () => `<div style="height:2400px"></div>
    <p id="bottom">Bottom of the order list</p>`,
  '/cookie': () => `<p role="status" id="theme">No theme</p>
    <script>
      const match = document.cookie.split('; ').find((part) => part.startsWith('theme='));
      document.getElementById('theme').textContent = match ? decodeURIComponent(match.split('=')[1]) : 'No theme';
    </script>`,
  '/clock': () => `<p role="status" id="status">Waiting</p>
    <script>
      setTimeout(() => {
        document.getElementById('status').textContent = 'Time moved';
      }, 60000);
    </script>`,
  '/socket': () => `<p role="status" id="status">Waiting</p>
    <script>
      const socket = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
      socket.onmessage = (event) => {
        document.getElementById('status').textContent = event.data;
      };
    </script>`,
  '/geo': () => `<button type="button" id="locate">Locate</button>
    <p role="status" id="status">No location</p>
    <script>
      document.getElementById('locate').onclick = () => {
        navigator.geolocation.getCurrentPosition((position) => {
          const latitude = position.coords.latitude.toFixed(2);
          const longitude = position.coords.longitude.toFixed(2);
          document.getElementById('status').textContent = latitude + ',' + longitude;
        }, () => {
          document.getElementById('status').textContent = 'Location denied';
        });
      };
    </script>`,
  '/console': () => `<button type="button" id="log">Log order</button>
    <script>
      document.getElementById('log').onclick = () => console.log('Order logged');
    </script>`,
  '/broken': () => `<button type="button" id="break">Break</button>
    <script>
      document.getElementById('break').onclick = () => { throw new Error('Order script failed'); };
    </script>`,
  '/net': () => `<button type="button" id="reload">Reload orders</button>
    <p role="status" id="status">Idle</p>
    <script>
      document.getElementById('reload').onclick = () => {
        fetch('/api/orders').then((response) => {
          document.getElementById('status').textContent = response.ok ? 'Orders reached' : 'Offline';
        }).catch(() => {
          document.getElementById('status').textContent = 'Offline';
        });
      };
    </script>`,
  '/worker': () => `<p role="status" id="status">No worker</p>
    <script>
      navigator.serviceWorker.register('/sw.js').then(() => {
        document.getElementById('status').textContent = 'Worker registered';
      });
    </script>`,
  '/storage': () => `<p role="status" aria-label="Saved customer" id="local"></p>
    <p role="status" aria-label="Draft size" id="session"></p>
    <script>
      document.getElementById('local').textContent = localStorage.getItem('customer') || 'Empty customer';
      document.getElementById('session').textContent = sessionStorage.getItem('draft') || 'Empty draft';
    </script>`,
};

async function handle(req, res) {
  const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
  const path = url.pathname;

  if (path === '/health') {
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
    res.end('ok');
    return;
  }

  if (path === '/files/receipt.txt' && req.method === 'GET') {
    res.writeHead(200, {
      'content-type': 'text/plain; charset=utf-8',
      'content-disposition': 'attachment; filename="receipt.txt"',
      'cache-control': 'no-store',
    });
    res.end(receipt);
    return;
  }

  if (path === '/api/orders' && req.method === 'GET') {
    sendJson(res, 200, [
      { customer: 'Northwind' },
      { customer: 'Contoso' },
    ]);
    return;
  }

  if (path === '/api/records' && req.method === 'GET') {
    sendJson(res, 200, [...records.values()]);
    return;
  }

  if (path === '/api/records' && req.method === 'POST') {
    const payload = JSON.parse(await readRawBody(req) || '{}');
    const name = typeof payload.name === 'string' ? payload.name.trim() : '';
    if (!name || name.length > 80) {
      sendJson(res, 400, { title: 'Name is required' });
      return;
    }
    const record = { id: randomUUID(), name };
    records.set(record.id, record);
    sendJson(res, 201, record);
    return;
  }

  const recordMatch = path.match(/^\/api\/records\/([0-9a-f-]{36})$/);
  if (recordMatch && req.method === 'GET') {
    const record = records.get(recordMatch[1]);
    sendJson(res, record ? 200 : 404, record || { title: 'Not found' });
    return;
  }

  if (recordMatch && (req.method === 'PUT' || req.method === 'PATCH')) {
    const record = records.get(recordMatch[1]);
    if (!record) {
      sendJson(res, 404, { title: 'Not found' });
      return;
    }
    const payload = JSON.parse(await readRawBody(req) || '{}');
    const name = typeof payload.name === 'string' ? payload.name.trim() : '';
    if (!name || name.length > 80) {
      sendJson(res, 400, { title: 'Name is required' });
      return;
    }
    record.name = name;
    sendJson(res, 200, record);
    return;
  }

  if (recordMatch && req.method === 'DELETE') {
    const removed = records.delete(recordMatch[1]);
    sendJson(res, removed ? 200 : 404, { removed });
    return;
  }

  if (path === '/graphql' && req.method === 'POST') {
    const payload = JSON.parse(await readRawBody(req) || '{}');
    const query = String(payload.query || '');
    if (query.includes('orders')) {
      sendJson(res, 200, { data: { orders: [{ customer: 'Northwind' }] } });
      return;
    }
    sendJson(res, 400, { errors: [{ message: 'Unknown query' }] });
    return;
  }

  if (path === '/sw.js' && req.method === 'GET') {
    res.writeHead(200, {
      'content-type': 'text/javascript; charset=utf-8',
      'cache-control': 'no-store',
    });
    res.end(`self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()); });
`);
    return;
  }

  if (path === '/login' && req.method === 'GET') {
    sendHtml(res, 200, 'Sign in', loginForm(''));
    return;
  }

  if (path === '/login' && req.method === 'POST') {
    const raw = await readRawBody(req);
    const form = new URLSearchParams(raw);
    const user = users.get(form.get('username') || '');
    if (!user || user.password !== (form.get('password') || '')) {
      sendHtml(res, 200, 'Sign in', loginForm('The username or password is incorrect.'));
      return;
    }
    const token = randomUUID();
    sessions.set(token, { username: user.username, name: user.name, role: user.role });
    res.writeHead(302, {
      location: '/home',
      'set-cookie': `session=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax`,
      'cache-control': 'no-store',
    });
    res.end();
    return;
  }

  if (path === '/permissions' && req.method === 'GET') {
    const user = currentUser(req);
    if (!user) {
      res.writeHead(302, { location: '/login', 'cache-control': 'no-store' });
      res.end();
      return;
    }
    const status = user.role === 'admin' ? 'Admin tools' : 'Reader view';
    sendHtml(res, 200, 'Permissions', `<p role="status">${status}</p>`);
    return;
  }

  if (path === '/home' && req.method === 'GET') {
    const user = currentUser(req);
    if (!user) {
      res.writeHead(302, { location: '/login', 'cache-control': 'no-store' });
      res.end();
      return;
    }
    sendHtml(res, 200, 'Home', `<p role="status">Signed in as ${escapeHtml(user.name)}</p>`);
    return;
  }

  if (req.method === 'GET' && pages[path]) {
    const title = {
      '/assertions': 'Assertions',
      '/locators': 'Locators',
      '/waiting': 'Waiting',
      '/desk': 'Orders desk',
      '/notes': 'Notes',
      '/forms': 'Order form',
      '/frames': 'Discount',
      '/frames/inner': 'Discount details',
      '/popup': 'Popup',
      '/receipt': 'Receipt',
      '/orders-ui': 'Orders',
      '/cards': 'Customers',
      '/visual': 'Visual card',
      '/files': 'Files',
      '/shadow': 'Shadow card',
      '/records': 'Records',
      '/order': 'New order',
      '/performance': 'Performance',
      '/browser': 'Browser',
      '/a11y/good': 'Contact',
      '/a11y/bad': 'Contact',
      '/nav': 'Guide',
      '/nav/next': 'Next page',
      '/nav/slow': 'Slow guide',
      '/details': 'Order details',
      '/rows': 'Order rows',
      '/keys': 'Search',
      '/pointer': 'Pointer',
      '/scroll': 'Long order',
      '/cookie': 'Theme cookie',
      '/storage': 'Stored values',
      '/clock': 'Clock',
      '/socket': 'Socket',
      '/worker': 'Worker',
      '/geo': 'Location',
      '/console': 'Console',
      '/broken': 'Broken script',
      '/net': 'Network',
    }[path];
    sendHtml(res, 200, title, pages[path]());
    return;
  }

  sendHtml(res, 404, 'Not found', '<p>That page is not on the local demo.</p>');
}

const server = createServer((req, res) => {
  handle(req, res).catch(() => {
    if (!res.headersSent) sendJson(res, 400, { title: 'Bad request' });
  });
});

server.on('upgrade', (req, socket) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
  const key = req.headers['sec-websocket-key'];
  if (url.pathname !== '/ws' || typeof key !== 'string') {
    socket.destroy();
    return;
  }
  const accept = createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
  );
  const payload = Buffer.from('Socket open');
  const frame = Buffer.alloc(2 + payload.length);
  frame[0] = 0x81;
  frame[1] = payload.length;
  payload.copy(frame, 2);
  socket.write(frame);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`demo listening on http://127.0.0.1:${port}`);
});
