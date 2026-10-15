"use client";
import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import { KIND_META, LAST_STAGE, STAGES } from "@/lib/catalog";
import { date, pkr } from "@/lib/format";
import type { Order } from "@/lib/types";
import ModelVisual, { type VisualModel } from "@/components/vehicle/ModelVisual";
import { SpotCard } from "@/components/ui";
import { Arrow } from "@/components/Icons";
import { StatusChip } from "./Timeline";

export default function OrderCard({ order, model, color }: { order: Pick<Order, "id" | "modelName" | "status" | "stage" | "total" | "createdAt" | "config">; model: VisualModel; color: string }) {
  const { t, tx, lang } = useI18n();
  const meta = KIND_META[model.kind];
  const live = order.status === "active" || order.status === "pending_payment";
  return (
    <Link href={`/orders/${order.id}`} className="block">
      <SpotCard tilt={3} className="glass group grid items-center gap-4 rounded-md p-4 sm:grid-cols-[180px_1fr_auto] sm:p-5" style={{ ["--accent" as string]: meta.accent, ["--accent-rgb" as string]: meta.glow } as React.CSSProperties}>
        <div className="stage overflow-hidden rounded">
          <ModelVisual model={model} color={color} colorId={order.config.color} wheel={order.config.wheel} reflection={false} className="aspect-[1000/560] w-full" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="latin-d font-semibold">{order.id}</span>
            <StatusChip status={order.status} />
          </div>
          <p className="latin-d mt-1 text-xl font-semibold">{order.modelName}</p>
          <p className="mt-1 text-sm text-ink/60">
            {live ? tx(STAGES[order.stage].title) : t.order.status[order.status]} · {date(order.createdAt, lang)}
          </p>
          {live && (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/10">
              <div className="h-full rounded-full bg-gradient-to-r from-[var(--volt)] to-[var(--blue)]" style={{ width: `${Math.max(order.stage / LAST_STAGE, 0.04) * 100}%` }} />
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
          <span className="font-display text-lg font-semibold">{pkr(order.total, lang)}</span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#111]">
            {t.orders.open} <Arrow size={14} />
          </span>
        </div>
      </SpotCard>
    </Link>
  );
}
