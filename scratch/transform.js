const fs = require('fs');

let code = fs.readFileSync('src/routes/admin.tsx', 'utf8');

// Replace light theme colors to dark theme
code = code.replace(/#ffffff/g, '#09090b'); // Cards bg
code = code.replace(/#f8fafc/g, '#18181b'); // Table headers / secondary bg
code = code.replace(/#e2e8f0/g, '#27272a'); // Borders
code = code.replace(/#f1f5f9/g, '#27272a'); // Secondary borders
code = code.replace(/#cbd5e1/g, '#3f3f46'); // Input borders
code = code.replace(/#0f172a/g, '#fafafa'); // Primary text
code = code.replace(/#334155/g, '#d4d4d8'); // Secondary text
code = code.replace(/#475569/g, '#a1a1aa'); // Tertiary text
code = code.replace(/boxShadow: "0 1px 3px rgba\(0,0,0,0.05\)"/g, 'boxShadow: "none"');

// Special color tweaks for dark theme readability
code = code.replace(/color: "#64748b"/g, 'color: "#a1a1aa"');
code = code.replace(/color: "#94a3b8"/g, 'color: "#71717a"');

// Add online state
if (!code.includes('const [onlineData, setOnlineData]')) {
  code = code.replace(
    'const [newIp, setNewIp] = useState("");',
    `const [newIp, setNewIp] = useState("");\n  const [onlineData, setOnlineData] = useState<{ online: number; pages: { page: string; count: number }[] } | null>(null);`
  );
}

// Add online effect
if (!code.includes('fetchOnline')) {
  code = code.replace(
    'useEffect(() => {',
    `useEffect(() => {
    if (!authed || !pw) return;
    const fetchOnline = async () => {
      try {
        const res = await fetch("/api/public/admin/online", { headers: { "X-Admin-Password": pw } });
        const j = await res.json();
        if (j.ok) setOnlineData(j);
      } catch {}
    };
    fetchOnline();
    const iv = setInterval(fetchOnline, 5000);
    return () => clearInterval(iv);
  }, [authed, pw]);

  useEffect(() => {`
  );
}

// Add online UI just above main
if (!code.includes('Visitantes Online Agora')) {
  code = code.replace(
    '<main style={{ padding: 24, flex: 1, overflow: "auto" }}>',
    `<main style={{ padding: 24, flex: 1, overflow: "auto" }}>
        {authed && onlineData !== null && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#18181b", border: "1px solid #27272a", borderRadius: 12, marginBottom: 24 }}>
            <div style={{ width: 10, height: 10, borderRadius: 5, background: "#10b981", boxShadow: "0 0 8px #10b981" }} />
            <div style={{ fontWeight: 600, color: "#fafafa", fontSize: 14 }}>Online Agora: {onlineData.online}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginLeft: 12 }}>
              {onlineData.pages.map(p => (
                <span key={p.page} style={{ fontSize: 12, padding: "2px 8px", background: "#27272a", color: "#d4d4d8", borderRadius: 6 }}>
                  {p.page}: <strong style={{ color: "#fafafa" }}>{p.count}</strong>
                </span>
              ))}
            </div>
          </div>
        )}`
  );
}

fs.writeFileSync('src/routes/admin.tsx', code, 'utf8');
console.log('Transform complete.');
