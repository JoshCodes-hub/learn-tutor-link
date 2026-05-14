import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/layout/Navbar";
import DashboardNav from "@/components/layout/DashboardNav";
import { SEO } from "@/components/seo/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  getTutorMaterialSignedUrl,
  TutorCurriculum,
  TutorMaterial,
  TutorTopic,
} from "@/hooks/useTutorCurricula";
import { toast } from "sonner";
import {
  BookOpen,
  Download,
  ExternalLink,
  FileText,
  GraduationCap,
  Search,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  Bookmark,
  BookmarkCheck,
  History,
  Save,
} from "lucide-react";
import { recordDownload, toggleBookmark, fetchBookmarks } from "@/lib/studentLibrary";
import { saveResource, type ResourceKind } from "@/lib/userResources";
import {
  cacheMaterialOffline,
  getCachedMaterial,
  listCachedMaterialIds,
  openCachedBlob,
  getAutoSaveEnabled,
  setAutoSaveEnabled,
} from "@/lib/offlineLibraryCache";
import { Switch } from "@/components/ui/switch";
import { CloudDownload } from "lucide-react";

interface TutorMini {
  id: string;
  full_name: string | null;
  profile_image_url: string | null;
  avatar_url: string | null;
  tutor_code: string | null;
}

const StudentTutorCourses = () => {
  const { user, profile, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [curricula, setCurricula] = useState<TutorCurriculum[]>([]);
  const [tutors, setTutors] = useState<Record<string, TutorMini>>({});
  const [topicsByCurriculum, setTopicsByCurriculum] = useState<Record<string, TutorTopic[]>>({});
  const [materialsByTopic, setMaterialsByTopic] = useState<Record<string, TutorMaterial[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [showAllLevels, setShowAllLevels] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [autoSave, setAutoSaveState] = useState<boolean>(getAutoSaveEnabled());
  const [cachedIds, setCachedIds] = useState<Set<string>>(new Set());

  const studentLevel = (profile as any)?.level as string | undefined;

  useEffect(() => {
    if (!user) return;
    fetchBookmarks(user.id).then((rows) => {
      setBookmarkedIds(new Set((rows ?? []).map((r: any) => `${r.resource_type}:${r.resource_id}`)));
    });
  }, [user]);

  useEffect(() => {
    listCachedMaterialIds().then((ids) => setCachedIds(new Set(ids))).catch(() => {});
  }, []);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("tutor_curricula")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (error) {
        toast.error("Could not load courses");
        setLoading(false);
        return;
      }
      const list = (data || []) as TutorCurriculum[];
      setCurricula(list);

      const tutorIds = [...new Set(list.map((c) => c.tutor_id))];
      if (tutorIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, profile_image_url, avatar_url, tutor_code")
          .in("id", tutorIds);
        const map: Record<string, TutorMini> = {};
        (profs || []).forEach((p: any) => (map[p.id] = p));
        setTutors(map);
      }
      setLoading(false);
    })();
  }, []);

  const visible = useMemo(() => {
    let list = curricula;
    if (studentLevel && !showAllLevels) {
      list = list.filter((c) => !c.level || c.level === studentLevel);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          (c.description || "").toLowerCase().includes(q) ||
          (tutors[c.tutor_id]?.full_name || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [curricula, studentLevel, showAllLevels, search, tutors]);

  const toggleExpand = async (curriculumId: string) => {
    const next = new Set(expanded);
    if (next.has(curriculumId)) {
      next.delete(curriculumId);
      setExpanded(next);
      return;
    }
    next.add(curriculumId);
    setExpanded(next);

    if (!topicsByCurriculum[curriculumId]) {
      const { data: topics } = await supabase
        .from("tutor_curriculum_topics")
        .select("*")
        .eq("curriculum_id", curriculumId)
        .order("order_index");
      const ts = (topics || []) as TutorTopic[];
      setTopicsByCurriculum((prev) => ({ ...prev, [curriculumId]: ts }));
      const topicIds = ts.map((t) => t.id);
      if (topicIds.length > 0) {
        const { data: mats } = await supabase
          .from("tutor_curriculum_materials")
          .select("*")
          .in("topic_id", topicIds)
          .order("order_index");
        const grouped: Record<string, TutorMaterial[]> = {};
        (mats || []).forEach((m: any) => {
          (grouped[m.topic_id] ||= []).push(m as TutorMaterial);
        });
        setMaterialsByTopic((prev) => ({ ...prev, ...grouped }));
        if (autoSave) void autoSaveMaterials((mats || []) as TutorMaterial[]);
      }
    }
  };

  const handleDownload = async (m: TutorMaterial) => {
    if (m.kind === "link" && m.external_url) {
      window.open(m.external_url, "_blank", "noopener");
      if (user) recordDownload({ userId: user.id, resourceType: "material", resourceId: m.id, title: m.title, level: studentLevel ?? null });
      return;
    }
    if (!m.storage_path) {
      toast.error("No file attached");
      return;
    }
    try {
      const cached = await getCachedMaterial(m.id);
      if (cached) {
        openCachedBlob(cached);
        if (user) recordDownload({ userId: user.id, resourceType: "material", resourceId: m.id, title: m.title, level: studentLevel ?? null });
        return;
      }
    } catch { /* fall through */ }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      toast.error("You're offline and this file isn't cached yet");
      return;
    }
    setDownloading(m.id);
    const url = await getTutorMaterialSignedUrl(m.storage_path, 600);
    if (!url) {
      setDownloading(null);
      toast.error("Could not generate download link");
      return;
    }
    window.open(url, "_blank", "noopener");
    if (user) recordDownload({ userId: user.id, resourceType: "material", resourceId: m.id, title: m.title, level: studentLevel ?? null });
    try {
      const res = await fetch(url);
      if (res.ok) {
        const blob = await res.blob();
        const ext = m.storage_path.split(".").pop() || undefined;
        await cacheMaterialOffline({
          id: m.id, title: m.title, mime: blob.type || "application/octet-stream",
          ext, blob, cached_at: Date.now(),
        });
        setCachedIds((prev) => new Set(prev).add(m.id));
      }
    } catch { /* ignore */ }
    setDownloading(null);
  };

  const handleToggleBookmark = async (m: TutorMaterial) => {
    if (!user) return;
    const key = `material:${m.id}`;
    const result = await toggleBookmark({
      userId: user.id, resourceType: "material", resourceId: m.id,
      title: m.title, level: studentLevel ?? null,
    });
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (result === "added") next.add(key); else next.delete(key);
      return next;
    });
    toast.success(result === "added" ? "Bookmarked" : "Removed bookmark");
  };

  const guessKind = (m: TutorMaterial): ResourceKind => {
    const ext = (m.storage_path || m.title || "").split(".").pop()?.toLowerCase() || "";
    if (["mp3", "wav", "m4a", "ogg"].includes(ext)) return "audio";
    if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "image";
    if (ext === "pdf") return "pdf";
    return "note";
  };

  const handleSaveToLibrary = async (m: TutorMaterial) => {
    if (!user) { toast.error("Please sign in"); return; }
    const key = `tutor-mat:${m.id}`;
    if (savedIds.has(key)) { toast.info("Already in your Library"); return; }
    setSavingId(m.id);
    try {
      if (m.kind === "link" && m.external_url) {
        const blob = new Blob([`${m.title}\n${m.external_url}\n`], { type: "text/plain" });
        await saveResource({
          userId: user.id, kind: "note", title: m.title, folder: "Tutor Courses",
          blob, mime: "text/plain", ext: "txt",
          meta: { source: "tutor_material", material_id: m.id, external_url: m.external_url },
        });
      } else if (m.content_text && !m.storage_path) {
        const blob = new Blob([m.content_text], { type: "text/plain" });
        await saveResource({
          userId: user.id, kind: "note", title: m.title, folder: "Tutor Courses",
          blob, mime: "text/plain", ext: "txt",
          meta: { source: "tutor_material", material_id: m.id },
        });
      } else if (m.storage_path) {
        const url = await getTutorMaterialSignedUrl(m.storage_path, 600);
        if (!url) throw new Error("Could not fetch file");
        const res = await fetch(url);
        if (!res.ok) throw new Error("Download failed");
        const blob = await res.blob();
        const ext = m.storage_path.split(".").pop() || undefined;
        await saveResource({
          userId: user.id, kind: guessKind(m), title: m.title, folder: "Tutor Courses",
          blob, mime: blob.type || undefined, ext,
          meta: { source: "tutor_material", material_id: m.id },
        });
        try {
          await cacheMaterialOffline({
            id: m.id, title: m.title, mime: blob.type || "application/octet-stream",
            ext, blob, cached_at: Date.now(),
          });
          setCachedIds((prev) => new Set(prev).add(m.id));
        } catch { /* ignore */ }
      } else {
        throw new Error("Nothing to save");
      }
      setSavedIds((prev) => new Set(prev).add(key));
      toast.success("Saved to your Library forever");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSavingId(null);
    }
  };

  const autoSaveMaterials = async (mats: TutorMaterial[]) => {
    if (!user || !autoSave) return;
    for (const m of mats) {
      const key = `tutor-mat:${m.id}`;
      if (savedIds.has(key)) continue;
      try {
        if (m.kind === "link" && m.external_url) {
          await saveResource({
            userId: user.id, kind: "note", title: m.title, folder: "Tutor Courses",
            blob: new Blob([`${m.title}\n${m.external_url}\n`], { type: "text/plain" }),
            mime: "text/plain", ext: "txt",
            meta: { source: "tutor_material_auto", material_id: m.id, external_url: m.external_url },
          });
        } else if (m.content_text && !m.storage_path) {
          await saveResource({
            userId: user.id, kind: "note", title: m.title, folder: "Tutor Courses",
            blob: new Blob([m.content_text], { type: "text/plain" }),
            mime: "text/plain", ext: "txt",
            meta: { source: "tutor_material_auto", material_id: m.id },
          });
        } else if (m.storage_path) {
          const url = await getTutorMaterialSignedUrl(m.storage_path, 600);
          if (!url) continue;
          const res = await fetch(url);
          if (!res.ok) continue;
          const blob = await res.blob();
          const ext = m.storage_path.split(".").pop() || undefined;
          await saveResource({
            userId: user.id, kind: guessKind(m), title: m.title, folder: "Tutor Courses",
            blob, mime: blob.type || undefined, ext,
            meta: { source: "tutor_material_auto", material_id: m.id },
          });
          try {
            await cacheMaterialOffline({
              id: m.id, title: m.title, mime: blob.type || "application/octet-stream",
              ext, blob, cached_at: Date.now(),
            });
            setCachedIds((prev) => new Set(prev).add(m.id));
          } catch { /* ignore */ }
        } else continue;
        setSavedIds((prev) => new Set(prev).add(key));
      } catch { /* skip silently */ }
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex justify-center pt-32">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Tutor Courses | OverraPrep AI"
        description="Browse courses uploaded by tutors for your level. Read, download materials and start quizzes."
      />
      <Navbar />
      <div className="pt-16 md:pt-[72px]">
        <DashboardNav role="student" />
      </div>

      <main className="container mx-auto px-4 pt-6 pb-16 max-w-6xl">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-amber-200/60 bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white p-6 md:p-8 mb-6 shadow-[0_18px_50px_-22px_rgba(180,140,40,0.55)]"
        >
          <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-white/15 blur-3xl pointer-events-none" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-amber-100/95 mb-1">
                Made for you
              </p>
              <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">
                Tutor Courses
              </h1>
              <p className="text-sm text-white/90 mt-1.5 max-w-lg">
                {studentLevel
                  ? `Showing courses curated for ${studentLevel} Level. Download materials, read notes, and chat with tutors.`
                  : "Set your level in your profile to filter to courses made for you."}
              </p>
            </div>
            {studentLevel && (
              <Button
                onClick={() => setShowAllLevels((v) => !v)}
                variant="secondary"
                className="bg-white text-amber-800 hover:bg-amber-50 border-0"
              >
                {showAllLevels ? `Only ${studentLevel}` : "All Levels"}
              </Button>
            )}
          </div>
          <div className="relative mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-white/15 backdrop-blur px-3.5 py-2.5 border border-white/25">
            <CloudDownload className="w-4 h-4 text-white shrink-0" />
            <div className="flex-1 min-w-[180px]">
              <p className="text-[12px] font-semibold leading-tight">Auto-save & offline</p>
              <p className="text-[11px] text-white/85 leading-snug">
                Save tutor files to your Library on view, and open them offline anytime.
              </p>
            </div>
            <Switch
              checked={autoSave}
              onCheckedChange={(v) => { setAutoSaveState(v); setAutoSaveEnabled(v); toast.success(v ? "Auto-save on" : "Auto-save off"); }}
              aria-label="Auto-save tutor materials"
            />
          </div>
        </motion.section>

        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, tutor, or topic"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11"
          />
        </div>

        {visible.length === 0 ? (
          <Card className="border-amber-100">
            <CardContent className="py-16 text-center">
              <Sparkles className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              <p className="font-display text-lg mb-1">No tutor courses yet</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {studentLevel && !showAllLevels
                  ? `No published courses for ${studentLevel} Level yet. Try "All Levels" or check back soon.`
                  : "Tutors are cooking new courses. Check back soon!"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {visible.map((c, i) => {
              const tutor = tutors[c.tutor_id];
              const isOpen = expanded.has(c.id);
              const topics = topicsByCurriculum[c.id] || [];
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.3) }}
                >
                  <Card className="border-amber-100/60 bg-gradient-to-br from-white to-amber-50/20 hover:border-amber-300 hover:shadow-[0_12px_36px_-12px_rgba(180,140,40,0.30)] transition-all overflow-hidden">
                    {c.cover_url && (
                      <div className="h-32 w-full overflow-hidden">
                        <img
                          src={c.cover_url}
                          alt={c.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            {c.level && (
                              <Badge variant="outline" className="border-amber-200 text-amber-800 bg-amber-50/60 text-[10px]">
                                {c.level} Level
                              </Badge>
                            )}
                            {tutor?.tutor_code && (
                              <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-800">
                                {tutor.tutor_code}
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-serif text-lg font-semibold truncate">{c.title}</h3>
                          {tutor && (
                            <Link
                              to={`/tutor/${c.tutor_id}`}
                              className="text-xs text-amber-700 hover:underline inline-flex items-center gap-1 mt-1"
                            >
                              <GraduationCap className="w-3.5 h-3.5" />
                              by {tutor.full_name || "Tutor"}
                            </Link>
                          )}
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0">
                          <BookOpen className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      {c.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {c.description}
                        </p>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleExpand(c.id)}
                        className="w-full border-amber-200 hover:bg-amber-50"
                      >
                        {isOpen ? (
                          <>
                            <ChevronUp className="w-4 h-4" /> Hide topics & materials
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" /> View topics & materials
                          </>
                        )}
                      </Button>

                      {isOpen && (
                        <div className="mt-4 space-y-3">
                          {topics.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic px-2">
                              No topics yet — the tutor is still building this course.
                            </p>
                          ) : (
                            topics.map((t) => {
                              const mats = materialsByTopic[t.id] || [];
                              return (
                                <div
                                  key={t.id}
                                  className="rounded-xl border border-amber-100 bg-white p-3"
                                >
                                  <p className="font-semibold text-sm text-foreground">{t.title}</p>
                                  {t.summary && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {t.summary}
                                    </p>
                                  )}
                                  {mats.length > 0 && (
                                    <ul className="mt-2 space-y-1.5">
                                      {mats.map((m) => (
                                        <li key={m.id} className="flex items-center justify-between gap-2 text-xs">
                                          <span className="flex items-center gap-1.5 min-w-0">
                                            <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                            <span className="truncate">{m.title}</span>
                                            {cachedIds.has(m.id) && (
                                              <Badge variant="outline" className="ml-1 px-1.5 py-0 h-4 text-[9px] border-emerald-200 bg-emerald-50 text-emerald-700">
                                                Offline
                                              </Badge>
                                            )}
                                          </span>
                                          <div className="flex items-center gap-0.5 shrink-0">
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 px-2 text-amber-700 hover:bg-amber-50"
                                            onClick={() => handleToggleBookmark(m)}
                                            aria-label="Bookmark"
                                          >
                                            {bookmarkedIds.has(`material:${m.id}`) ? (
                                              <BookmarkCheck className="w-3.5 h-3.5 fill-amber-500" />
                                            ) : (
                                              <Bookmark className="w-3.5 h-3.5" />
                                            )}
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 px-2 text-amber-700 hover:bg-amber-50"
                                            onClick={() => handleSaveToLibrary(m)}
                                            disabled={savingId === m.id}
                                            aria-label="Save to Library"
                                            title="Save to Library (keeps it forever)"
                                          >
                                            {savingId === m.id ? (
                                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                              <Save className={`w-3.5 h-3.5 ${savedIds.has(`tutor-mat:${m.id}`) ? "text-emerald-600" : ""}`} />
                                            )}
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 px-2 text-amber-700 hover:bg-amber-50"
                                            onClick={() => handleDownload(m)}
                                            disabled={downloading === m.id}
                                          >
                                            {downloading === m.id ? (
                                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : m.kind === "link" ? (
                                              <ExternalLink className="w-3.5 h-3.5" />
                                            ) : (
                                              <Download className="w-3.5 h-3.5" />
                                            )}
                                          </Button>
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentTutorCourses;