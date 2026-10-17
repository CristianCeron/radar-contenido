import { formatDate } from "../lib/format";

// Aviso cuando la corrida diaria no actualizó el radar a tiempo.
export function StaleWarning({ generatedAt }: { generatedAt: string }) {
  return (
    <div
      data-testid="stale-warning"
      role="status"
      className="flex items-center gap-3.5 rounded-[18px] border border-[#e8d86e] bg-[#fffad9] px-5 py-4"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6b5a00" strokeWidth="1.5" aria-hidden="true" className="shrink-0">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      <span className="text-base text-[#4a3f00]">
        <b>Estos datos tienen más de un día. La actualización no corrió a tiempo;</b> ves el último resultado guardado, del{" "}
        {formatDate(generatedAt)}.
      </span>
    </div>
  );
}
