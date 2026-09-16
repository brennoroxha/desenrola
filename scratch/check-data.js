const fetch = require('node-fetch') || globalThis.fetch;
fetch('http://localhost:5173/api/public/admin/data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Admin-Password': 'admin' },
  body: JSON.stringify({ day: '2026-09-15' })
}).then(res => res.json()).then(d => {
  console.log("Events count:", d.events?.length);
  console.log("Latest events:", d.events?.slice(0, 5));
}).catch(console.error);
