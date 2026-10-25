"use client";

import { useEffect, useState } from "react";
import {
  AdminApiError,
  getAdminIphoneModels,
  getStockRule,
  setAllStockGroups,
  type AdminIphoneModel,
} from "@/lib/adminApi";
import AdminNotice from "../../AdminNotice";
import { ADMIN_CARD, ADMIN_PAGE_SUBTITLE, ADMIN_PAGE_TITLE, ADMIN_TEXT_MUTED } from "../../adminStyles";
import { STOCK_CHANGED } from "../stockData";
import StockGroupsEditor from "../StockGroupsEditor";
import AdminLoading from "../../AdminLoading";

const plural = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${many}`);

/**
 * Stock › Stock compartido: la regla general de qué modelos comparten stock
 * (13 + 14, la línea 18…). Queda guardada y vale para todos los productos,
 * también los que se carguen después. Un producto puntual se cambia en su
 * ficha y queda como excepción.
 */
export default function StockCompartidoPage() {
  const [models, setModels] = useState<AdminIphoneModel[] | null>(null);
  const [rule, setRule] = useState<string[][] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    Promise.all([getAdminIphoneModels(), getStockRule()])
      .then(([m, r]) => {
        if (ignore) return;
        setModels([...m.data].sort((a, b) => a.sort_order - b.sort_order));
        setRule(r.data);
      })
      .catch((err) => {
        if (!ignore) setError(err instanceof AdminApiError ? err.message : "No se pudo cargar la regla.");
      });
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="flex max-w-[760px] flex-col gap-5">
      <div>
        <h1 className={ADMIN_PAGE_TITLE}>Stock compartido</h1>
        <p className={ADMIN_PAGE_SUBTITLE}>
          Los modelos que usan las mismas fundas (p. ej. 13 + 14, o toda la línea 18). La regla queda guardada y vale
          para todos los productos, también los que cargues después: en cada color o diseño esos modelos tienen siempre
          el mismo stock, y vender, reservar o comprar uno mueve a los otros.
        </p>
      </div>

      {notice && (
        <AdminNotice kind="ok" onClose={() => setNotice(null)}>
          {notice}
        </AdminNotice>
      )}
      {error && (
        <AdminNotice kind="danger" onClose={() => setError(null)}>
          {error}
        </AdminNotice>
      )}

      {models === null || rule === null ? (
        !error && <AdminLoading />
      ) : (
        <section className={`${ADMIN_CARD} flex flex-col gap-3`}>
          <p className={ADMIN_TEXT_MUTED}>
            Al guardar, cada color queda con el stock más alto de sus modelos, y si a un producto le falta el color en
            algún modelo del grupo, se le crea. Si cargás un color o un modelo nuevo, se suma solo. Un producto que
            necesite otra cosa se cambia en su ficha y queda como excepción.
          </p>
          <StockGroupsEditor
            key={JSON.stringify(rule)}
            models={models.map((m) => ({ id: m.id, name: m.name }))}
            initialGroups={rule}
            saveLabel="Guardar regla"
            preview={async (groups) => {
              const { data } = await setAllStockGroups(groups, true);
              if (groups.length === 0) return "Ningún modelo va a compartir stock (salvo las excepciones). ¿Confirmás?";
              const parts = [`Quedan ${plural(data.products, "producto", "productos")} con stock compartido.`];
              if (data.changes > 0)
                parts.push(
                  `Se igualan ${plural(data.changes, "variante", "variantes")} al stock más alto de su color.`,
                );
              if (data.created > 0)
                parts.push(`Se crean ${plural(data.created, "variante", "variantes")} que faltaban.`);
              return `${parts.join(" ")} ¿Confirmás?`;
            }}
            apply={async (groups) => {
              const { data } = await setAllStockGroups(groups);
              setRule(groups);
              return groups.length === 0
                ? "Regla guardada: ningún modelo comparte stock."
                : `Regla guardada: ${plural(data.products, "producto comparte", "productos comparten")} stock.`;
            }}
            onSaved={(message) => {
              setNotice(message);
              window.dispatchEvent(new Event(STOCK_CHANGED));
            }}
          />
        </section>
      )}
    </div>
  );
}
