import { Link } from "react-router-dom";
import { ArrowLeft, Monitor, Trash2, Shield } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { useDeviceHistory } from "@/hooks/useDeviceHistory";
import { useTrustScore, trustTier } from "@/hooks/useTrustScore";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

export default function DeviceSessions() {
  const { data: devices = [], isLoading, remove } = useDeviceHistory();
  const { data: trust } = useTrustScore();
  const tier = trust ? trustTier(trust.score) : null;

  return (
    <>
      <SEO title="Devices & sessions — OverraPrep AI" description="See where you're signed in and your account trust score." />
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-amber-100/70 sticky top-0 z-30">
          <div className="container mx-auto px-4 h-14 flex items-center gap-3 max-w-2xl">
            <Link to="/student/dashboard" className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
            <h1 className="font-display text-base font-bold">Devices & security</h1>
          </div>
        </header>

        <main className="container mx-auto px-4 py-5 max-w-2xl space-y-5">
          {/* Trust card */}
          <section className="rounded-2xl border border-amber-100/70 bg-gradient-to-br from-amber-50/60 to-white p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-amber-600" />
              <h2 className="font-display text-sm font-bold">Account trust</h2>
              {tier && (
                <span className={`ml-auto text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${tier.tone}`}>
                  {tier.label}
                </span>
              )}
            </div>
            <div className="flex items-end gap-2">
              <div className="text-3xl font-display font-bold">{trust?.score ?? "—"}</div>
              <div className="text-xs text-muted-foreground mb-1">/ 100</div>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-amber-100/70 overflow-hidden">
              <div className="h-full bg-amber-500 transition-all" style={{ width: `${trust?.score ?? 0}%` }} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
              <div><div className="text-muted-foreground">Profile</div><div className="font-semibold">{trust?.profile_pct ?? 0}%</div></div>
              <div><div className="text-muted-foreground">Study days</div><div className="font-semibold">{trust?.study_days ?? 0}</div></div>
              <div><div className="text-muted-foreground">Account</div><div className="font-semibold">{trust?.age_days ?? 0}d</div></div>
            </div>
          </section>

          {/* Devices */}
          <section>
            <h2 className="font-display text-sm font-bold mb-2">Active devices</h2>
            {isLoading ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : devices.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center rounded-xl border border-dashed border-amber-200/70 bg-amber-50/40">
                No device activity yet. Sign in from another device to see it here.
              </p>
            ) : (
              <ul className="space-y-2">
                {devices.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 p-3 rounded-xl border border-amber-100/70 bg-card">
                    <div className="h-9 w-9 rounded-lg bg-amber-50 grid place-items-center">
                      <Monitor className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{d.device_label || "Unknown device"}</div>
                      <div className="text-[11px] text-muted-foreground">
                        Active {formatDistanceToNow(new Date(d.last_active_at), { addSuffix: true })}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => remove.mutate(d.id)} className="text-rose-600 hover:text-rose-700">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[11px] text-muted-foreground mt-3">
              Tip: if you don't recognise a device, remove it and change your password.
            </p>
          </section>
        </main>
      </div>
    </>
  );
}