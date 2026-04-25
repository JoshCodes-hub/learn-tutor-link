import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, ShieldCheck, Sparkles, Mail, Database, CreditCard } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

interface CheckItem {
  key: string;
  label: string;
  category: "ai" | "email" | "infrastructure" | "payments";
  required: boolean;
  configured: boolean;
  description: string;
  setupHint: string;
}

interface CheckResponse {
  healthy: boolean;
  checks: CheckItem[];
  summary: {
    total: number;
    configured: number;
    missingRequired: number;
    missingOptional: number;
  };
  checkedAt: string;
}

const categoryMeta: Record<CheckItem["category"], { label: string; icon: React.ElementType }> = {
  ai: { label: "AI", icon: Sparkles },
  email: { label: "Email", icon: Mail },
  infrastructure: { label: "Infrastructure", icon: Database },
  payments: { label: "Payments", icon: CreditCard },
};

export default function StartupChecklist() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<CheckResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const runCheck = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("startup-check");
      if (error) throw error;
      setData(data);
    } catch (e: any) {
      setError(e.message || "Failed to run startup check");
      toast.error("Could not reach the startup-check function");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) runCheck();
  }, [isAdmin]);

  if (authLoading || isAdmin === null) {
    return (
      <div className="container mx-auto p-8 space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const grouped = data?.checks.reduce<Record<string, CheckItem[]>>((acc, c) => {
    (acc[c.category] ||= []).push(c);
    return acc;
  }, {});

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-start justify-between gap-4 flex-wrap"
      >
        <div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            Startup Checklist
          </h1>
          <p className="text-muted-foreground mt-2">
            Verify required secrets and integrations before going live.
          </p>
        </div>
        <Button onClick={runCheck} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Re-run check
        </Button>
      </motion.div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Check failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {data && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6"
        >
          <Alert variant={data.healthy ? "default" : "destructive"}>
            {data.healthy ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertTitle>
              {data.healthy ? "All required services configured" : `${data.summary.missingRequired} required item(s) missing`}
            </AlertTitle>
            <AlertDescription>
              {data.summary.configured} of {data.summary.total} secrets configured
              {data.summary.missingOptional > 0 && ` • ${data.summary.missingOptional} optional missing`}
              {" • "}Last checked {new Date(data.checkedAt).toLocaleTimeString()}
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {loading && !data && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      )}

      {grouped && (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, items]) => {
            const meta = categoryMeta[category as CheckItem["category"]];
            const Icon = meta.icon;
            return (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Icon className="h-5 w-5 text-primary" />
                    {meta.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {items.map((item) => (
                    <motion.div
                      key={item.key}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-4 rounded-lg border transition-colors ${
                        item.configured
                          ? "bg-primary/5 border-primary/20"
                          : item.required
                            ? "bg-destructive/5 border-destructive/30"
                            : "bg-muted/30 border-border"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {item.configured ? (
                          <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        ) : item.required ? (
                          <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">{item.label}</h3>
                            <Badge variant={item.required ? "default" : "secondary"} className="text-xs">
                              {item.required ? "Required" : "Optional"}
                            </Badge>
                            <code className="text-xs text-muted-foreground font-mono">{item.key}</code>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                          {!item.configured && (
                            <CardDescription className="mt-2 text-xs italic">
                              💡 {item.setupHint}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
