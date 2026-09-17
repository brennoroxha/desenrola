import { useState } from "react";
import { track } from "@/lib/tracking";

export function ComprovanteUpload({ transactionId, acordo, cpf, nome }: { transactionId: string; acordo: string; cpf: string; nome: string }) {
  const [fileName, setFileName] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");

  const send = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { setStatus("error"); setMsg("Arquivo maior que 5MB."); return; }
    setStatus("sending"); setMsg("");
    try {
      const b64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => {
          const s = String(r.result || "");
          resolve(s.includes(",") ? s.split(",")[1] : s);
        };
        r.onerror = () => reject(new Error("read"));
        r.readAsDataURL(file);
      });
      const res = await fetch("/api/public/comprovante/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_id: transactionId || null,
          acordo, cpf, nome,
          filename: file.name,
          mime: file.type || "application/octet-stream",
          size_bytes: file.size,
          data_base64: b64,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) { setStatus("error"); setMsg("Falha ao enviar. Tente novamente."); return; }
      track("pagamento", "pagamento_comprovante_upload", { cpf, nome, acordo, meta: { transactionId, filename: file.name, size: file.size } });
      setStatus("ok");
      setMsg("Comprovante recebido! Estamos analisando seu pagamento.");
    } catch {
      setStatus("error"); setMsg("Erro ao processar o arquivo.");
    }
  };

  return (
    <div style={{ marginTop: 20, padding: 18, background: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)", border: "2px dashed #D97706", borderRadius: 12, textAlign: "left", boxShadow: "0 4px 14px rgba(245, 158, 11, 0.25)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 20 }}>📄</span>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#92400E", textTransform: "uppercase" }}>Já realizou o pagamento?</div>
      </div>
      <div style={{ fontSize: 13, color: "#92400E", marginBottom: 16, lineHeight: 1.5, fontWeight: 500 }}>
        Anexe seu comprovante agora (PDF ou imagem até 5MB) para <strong>acelerarmos a baixa</strong> e seu nome ser limpo ainda mais rápido! O envio começa automaticamente ao selecionar o arquivo.
      </div>
      {status !== "ok" && (
        <input
          type="file"
          accept="image/*,application/pdf"
          disabled={status === "sending"}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setFileName(f.name);
            void send(f);
          }}
          style={{ display: "block", width: "100%", padding: 8, background: "#fff", border: "1px solid #F59E0B", borderRadius: 6, fontSize: 13 }}
        />
      )}
      {status === "sending" && (
        <div style={{ marginTop: 10, fontSize: 13, fontWeight: 600, color: "#92400E" }}>
          Enviando {fileName}...
        </div>
      )}
      {msg && (
        <div style={{ marginTop: 10, fontSize: 13, fontWeight: 600, color: status === "ok" ? "#059669" : "#DC2626" }}>{msg}</div>
      )}
    </div>
  );
}
