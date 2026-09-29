import { CircleAlert, CircleCheck, X } from "lucide-react";

type Kind = "ink" | "ok" | "danger";

const LOOK: Record<Kind, string> = {
  ink: "bg-admin-ink text-white",
  ok: "bg-admin-ok-bg text-admin-ok",
  danger: "border border-admin-danger-border bg-admin-danger-bg text-admin-danger",
};

/** Aviso del panel con ícono (error en rojo, confirmaciones en negro o verde). */
export default function AdminNotice({
  kind = "ink",
  children,
  onClose,
}: {
  kind?: Kind;
  children: React.ReactNode;
  onClose?: () => void;
}) {
  const Icon = kind === "danger" ? CircleAlert : CircleCheck;
  return (
    <div
      role={kind === "danger" ? "alert" : "status"}
      className={`flex min-h-12 items-center gap-3 rounded-md py-2.5 pl-3.5 pr-2 text-sm font-medium leading-snug ${LOOK[kind]}`}
    >
      <Icon aria-hidden="true" className="size-5 shrink-0" />
      <span className="min-w-0 flex-1">{children}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar aviso"
          className="flex size-9 shrink-0 items-center justify-center rounded-md"
        >
          <X aria-hidden="true" className="size-[18px]" />
        </button>
      )}
    </div>
  );
}
