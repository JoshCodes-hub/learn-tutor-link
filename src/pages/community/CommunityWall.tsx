import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/layout/Navbar";
import DashboardNav from "@/components/layout/DashboardNav";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { SEO } from "@/components/seo/SEO";
import { toast } from "sonner";
import { Heart, MessageCircle, Image as ImageIcon, Send, Loader2, X, Globe, BookOpen, Trash2, Shield, GraduationCap, Sparkles, Lightbulb, FileText, AtSign, BookCheck, ListChecks, Brain } from "lucide-react";
import { useMyCourses } from "@/hooks/useMyCourses";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

type AIMode = "tips" | "summary" | "cbt_tips" | "concept" | "likely_questions";

const AI_MODES: { value: AIMode; label: string; icon: any; desc: string }[] = [
  { value: "tips", label: "Study tips", icon: Lightbulb, desc: "Actionable study advice" },
  { value: "cbt_tips", label: "CBT exam tips", icon: BookCheck, desc: "Time, traps, recall tricks" },
  { value: "summary", label: "Concept summary", icon: FileText, desc: "Tight 2-3 sentence summary" },
  { value: "concept", label: "Concept explainer", icon: Brain, desc: "Explain core ideas simply" },
  { value: "likely_questions", label: "Likely questions", icon: ListChecks, desc: "5 exam-style questions" },
];

const AI_PREF_KEY = "community-ai-mode";

interface Post {
  id: string;
  author_id: string;
  channel_type: "global" | "course";
  course_id: string | null;
  content: string;
  image_url: string | null;
  like_count: number;
  comment_count: number;
  created_at: string;
}

interface AuthorMini {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  profile_image_url: string | null;
}

interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

const CommunityWall = () => {
  const { user, profile, isLoading: authLoading, primaryRole, hasRole } = useAuth();
  const navigate = useNavigate();
  const { courseIds } = useMyCourses();

  const [channel, setChannel] = useState<string>("global"); // 'global' or course id
  const [courses, setCourses] = useState<{ id: string; code: string; name: string }[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [authors, setAuthors] = useState<Record<string, AuthorMini>>({});
  const [authorRoles, setAuthorRoles] = useState<Record<string, string[]>>({});
  const [likes, setLikes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Composer
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Comment state per post
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, Comment[]>>({});

  // Ask AI per post
  const [aiByPost, setAiByPost] = useState<Record<string, { loading: boolean; mode: AIMode | null; content: string | null }>>({});
  const [aiMode, setAiMode] = useState<AIMode>(() => {
    const saved = (typeof localStorage !== "undefined" && localStorage.getItem(AI_PREF_KEY)) as AIMode | null;
    return (saved && AI_MODES.some(m => m.value === saved)) ? saved : "tips";
  });
  useEffect(() => {
    try { localStorage.setItem(AI_PREF_KEY, aiMode); } catch {}
  }, [aiMode]);

  // Tutor mention picker
  const [tutorPickerOpen, setTutorPickerOpen] = useState(false);
  const [tutorList, setTutorList] = useState<{ id: string; full_name: string | null; tutor_code: string | null }[]>([]);

  const askAI = async (post: Post, mode: AIMode) => {
    if (!post.content?.trim()) { toast.error("This post has no text to analyze"); return; }
    setAiByPost(prev => ({ ...prev, [post.id]: { loading: true, mode, content: null } }));
    try {
      const { data, error } = await supabase.functions.invoke("community-ask-ai", {
        body: { text: post.content, mode },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setAiByPost(prev => ({ ...prev, [post.id]: { loading: false, mode, content: (data as any)?.content || "No response" } }));
    } catch (err: any) {
      setAiByPost(prev => ({ ...prev, [post.id]: { loading: false, mode: null, content: null } }));
      toast.error(err?.message || "AI request failed");
    }
  };

  const closeAI = (postId: string) =>
    setAiByPost(prev => ({ ...prev, [postId]: { loading: false, mode: null, content: null } }));

  const navRole = (primaryRole === "admin" || primaryRole === "tutor" ? primaryRole : "student") as "admin" | "tutor" | "student";

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  // Load courses for channel switcher (student's enrolled OR tutor's handled)
  useEffect(() => {
    (async () => {
      let ids: string[] = courseIds;
      if (hasRole("tutor")) {
        const { data } = await (supabase as any).from("tutor_courses").select("course_id").eq("tutor_id", user?.id);
        ids = Array.from(new Set([...(data ?? []).map((r: any) => r.course_id), ...courseIds]));
      }
      if (ids.length === 0) { setCourses([]); return; }
      const { data: cs } = await supabase.from("courses").select("id, code, name").in("id", ids).eq("is_active", true).order("code");
      setCourses((cs as any) ?? []);
    })();
  }, [user?.id, courseIds, hasRole]);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("community_posts").select("*").order("created_at", { ascending: false }).limit(100);
    if (channel === "global") q = (q as any).eq("channel_type", "global");
    else q = (q as any).eq("channel_type", "course").eq("course_id", channel);
    const { data } = await q;
    const list = ((data as any) ?? []) as Post[];
    setPosts(list);

    // Fetch authors
    const ids = Array.from(new Set(list.map(p => p.author_id)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, avatar_url, profile_image_url").in("id", ids);
      const m: Record<string, AuthorMini> = {};
      (profs ?? []).forEach((p: any) => { m[p.id] = p; });
      setAuthors(m);
      const { data: rs } = await (supabase as any).from("user_roles").select("user_id, role").in("user_id", ids);
      const rm: Record<string, string[]> = {};
      (rs ?? []).forEach((r: any) => { (rm[r.user_id] ||= []).push(r.role); });
      setAuthorRoles(rm);
    }

    // Existing likes
    if (user && list.length) {
      const { data: likesData } = await (supabase as any)
        .from("community_likes").select("post_id")
        .eq("user_id", user.id).in("post_id", list.map(p => p.id));
      setLikes(new Set((likesData ?? []).map((l: any) => l.post_id)));
    }
    setLoading(false);
  }, [channel, user]);

  useEffect(() => { if (user) loadPosts(); }, [user, loadPosts]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`wall-${channel}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_posts" }, (payload: any) => {
        const p = payload.new as Post;
        const matches = channel === "global" ? p.channel_type === "global" : (p.channel_type === "course" && p.course_id === channel);
        if (matches) {
          setPosts(prev => prev.some(x => x.id === p.id) ? prev : [p, ...prev]);
          if (!authors[p.author_id]) {
            supabase.from("profiles").select("id, full_name, avatar_url, profile_image_url").eq("id", p.author_id).maybeSingle()
              .then(({ data }) => { if (data) setAuthors(prev => ({ ...prev, [p.author_id]: data as any })); });
          }
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "community_posts" }, (payload: any) => {
        const p = payload.new as Post;
        setPosts(prev => prev.map(x => x.id === p.id ? p : x));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "community_posts" }, (payload: any) => {
        setPosts(prev => prev.filter(x => x.id !== (payload.old as Post).id));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [channel, user, authors]);

  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast.error("Image only"); return; }
    if (f.size > 5 * 1024 * 1024) { toast.error("Max 5 MB"); return; }
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  };

  const submitPost = async () => {
    if (!user) return;
    if (!content.trim() && !imageFile) { toast.error("Write something or attach an image"); return; }
    if (content.length > 2000) { toast.error("Max 2000 chars"); return; }
    setPosting(true);
    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop() || "jpg";
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("community-media").upload(path, imageFile, { upsert: false });
        if (upErr) throw upErr;
        imageUrl = supabase.storage.from("community-media").getPublicUrl(path).data.publicUrl;
      }
      const payload: any = {
        author_id: user.id,
        channel_type: channel === "global" ? "global" : "course",
        course_id: channel === "global" ? null : channel,
        content: content.trim(),
        image_url: imageUrl,
      };
      const { error } = await (supabase as any).from("community_posts").insert(payload);
      if (error) throw error;
      setContent(""); setImageFile(null); setImagePreview(null);
      if (fileInput.current) fileInput.current.value = "";
      toast.success("Posted");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to post");
    } finally {
      setPosting(false);
    }
  };

  const toggleLike = async (post: Post) => {
    if (!user) return;
    const liked = likes.has(post.id);
    // Optimistic
    setLikes(prev => { const n = new Set(prev); liked ? n.delete(post.id) : n.add(post.id); return n; });
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, like_count: p.like_count + (liked ? -1 : 1) } : p));
    if (liked) {
      await (supabase as any).from("community_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
    } else {
      await (supabase as any).from("community_likes").insert({ post_id: post.id, user_id: user.id });
    }
  };

  const toggleComments = async (postId: string) => {
    setOpenComments(prev => { const n = new Set(prev); n.has(postId) ? n.delete(postId) : n.add(postId); return n; });
    if (!commentsByPost[postId]) {
      const { data } = await (supabase as any).from("community_comments").select("*").eq("post_id", postId).order("created_at", { ascending: true });
      setCommentsByPost(prev => ({ ...prev, [postId]: (data as Comment[]) ?? [] }));
      // ensure authors loaded for comments
      const ids = Array.from(new Set(((data as Comment[]) ?? []).map(c => c.author_id))).filter(id => !authors[id]);
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name, avatar_url, profile_image_url").in("id", ids);
        const m = { ...authors };
        (profs ?? []).forEach((p: any) => { m[p.id] = p; });
        setAuthors(m);
      }
    }
  };

  const submitComment = async (postId: string) => {
    if (!user) return;
    const text = (commentDraft[postId] || "").trim();
    if (!text) return;
    if (text.length > 1000) { toast.error("Max 1000 chars"); return; }
    const { data, error } = await (supabase as any).from("community_comments").insert({ post_id: postId, author_id: user.id, content: text }).select().single();
    if (error) { toast.error(error.message); return; }
    setCommentsByPost(prev => ({ ...prev, [postId]: [...(prev[postId] || []), data as Comment] }));
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p));
    setCommentDraft(prev => ({ ...prev, [postId]: "" }));
  };

  const deletePost = async (post: Post) => {
    if (!confirm("Delete this post?")) return;
    const { error } = await (supabase as any).from("community_posts").delete().eq("id", post.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
  };

  const initials = (name: string | null) =>
    (name || "U").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  const channelLabel = useMemo(() => {
    if (channel === "global") return "Global Community";
    const c = courses.find(x => x.id === channel);
    return c ? `${c.code} · ${c.name}` : "Course";
  }, [channel, courses]);

  if (authLoading) {
    return <div className="min-h-screen bg-background"><Navbar /><div className="flex justify-center pt-32"><LoadingSpinner /></div></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Community Wall | OverraPrep AI" description="Connect with students and tutors across the platform." />
      <Navbar />
      <div className="pt-16 md:pt-[72px]"><DashboardNav role={navRole} /></div>
      <main className="container mx-auto px-4 pt-6 pb-16 max-w-3xl">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold mb-1">Community Wall</h1>
          <p className="text-muted-foreground">Talk, share notes & celebrate wins with everyone.</p>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 items-center">
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger className="w-[280px]">
              <SelectValue>
                <span className="inline-flex items-center gap-2">
                  {channel === "global" ? <Globe className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                  {channelLabel}
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="global"><span className="inline-flex items-center gap-2"><Globe className="w-4 h-4" /> Global Community</span></SelectItem>
              {courses.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="inline-flex items-center gap-2"><BookOpen className="w-4 h-4" /> {c.code} · {c.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {courses.length === 0 && (
            <Link to={hasRole("tutor") ? "/tutor/courses" : "/my-courses"} className="text-xs text-primary underline">
              Add courses to unlock channels
            </Link>
          )}
        </div>

        {/* Composer */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={(profile as any)?.avatar_url || (profile as any)?.profile_image_url || undefined} />
                <AvatarFallback>{initials(profile?.full_name || null)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={`Share with ${channel === "global" ? "everyone" : channelLabel}...`}
                  rows={3}
                  maxLength={2000}
                />
                {imagePreview && (
                  <div className="relative inline-block">
                    <img src={imagePreview} alt="preview" className="max-h-48 rounded-lg border" />
                    <button onClick={() => { setImageFile(null); setImagePreview(null); if (fileInput.current) fileInput.current.value = ""; }}
                      className="absolute top-1 right-1 bg-background/90 rounded-full p-1 border">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="sm" onClick={() => fileInput.current?.click()}>
                    <ImageIcon className="w-4 h-4 mr-1" /> Image
                  </Button>
                  <input type="file" ref={fileInput} accept="image/*" className="hidden" onChange={onPickImage} />
                  <Button size="sm" disabled={posting || (!content.trim() && !imageFile)} onClick={submitPost}>
                    {posting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
                    Post
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feed */}
        {loading ? <div className="flex justify-center py-12"><LoadingSpinner /></div> :
          posts.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Nothing here yet — be the first!</CardContent></Card>
          ) : (
            <div className="space-y-4">
              {posts.map(p => {
                const a = authors[p.author_id];
                const roles = authorRoles[p.author_id] || [];
                const canDelete = p.author_id === user?.id || hasRole("admin");
                const av = a?.avatar_url || a?.profile_image_url || null;
                const isOpen = openComments.has(p.id);
                return (
                  <Card key={p.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={av || undefined} />
                            <AvatarFallback>{initials(a?.full_name || null)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm">{a?.full_name || "User"}</span>
                              {roles.includes("admin") && <Badge variant="secondary" className="gap-1 text-xs"><Shield className="w-3 h-3" /> Admin</Badge>}
                              {roles.includes("tutor") && <Badge variant="outline" className="gap-1 text-xs"><GraduationCap className="w-3 h-3" /> Tutor</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</p>
                          </div>
                        </div>
                        {canDelete && (
                          <Button variant="ghost" size="sm" onClick={() => deletePost(p)}>
                            <Trash2 className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {p.content && <p className="whitespace-pre-wrap text-sm">{p.content}</p>}
                      {p.image_url && <img src={p.image_url} alt="" className="rounded-lg border max-h-[480px] object-cover w-full" />}
                      <div className="flex items-center gap-1 pt-1 flex-wrap">
                        <Button variant="ghost" size="sm" onClick={() => toggleLike(p)} className="gap-1.5">
                          <Heart className={`w-4 h-4 ${likes.has(p.id) ? "fill-primary text-primary" : ""}`} />
                          {p.like_count}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => toggleComments(p.id)} className="gap-1.5">
                          <MessageCircle className="w-4 h-4" />
                          {p.comment_count}
                        </Button>
                        {p.content && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="gap-1.5 ml-auto" disabled={aiByPost[p.id]?.loading}>
                                {aiByPost[p.id]?.loading
                                  ? <Loader2 className="w-4 h-4 animate-spin" />
                                  : <Sparkles className="w-4 h-4 text-primary" />}
                                Ask AI
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => askAI(p, "tips")}>
                                <Lightbulb className="w-4 h-4 mr-2" /> Study tips
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => askAI(p, "summary")}>
                                <FileText className="w-4 h-4 mr-2" /> Summarize
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                      {aiByPost[p.id]?.content && (
                        <div className="rounded-lg border bg-primary/5 p-3 text-sm">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                              <Sparkles className="w-3.5 h-3.5" />
                              AI {aiByPost[p.id]?.mode === "summary" ? "summary" : "study tips"}
                            </div>
                            <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => closeAI(p.id)}>
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="whitespace-pre-wrap text-sm">{aiByPost[p.id]?.content}</div>
                        </div>
                      )}
                      {isOpen && (
                        <div className="border-t pt-3 space-y-3">
                          {(commentsByPost[p.id] || []).map(c => {
                            const ca = authors[c.author_id];
                            return (
                              <div key={c.id} className="flex gap-2">
                                <Avatar className="w-7 h-7"><AvatarImage src={ca?.avatar_url || ca?.profile_image_url || undefined} /><AvatarFallback>{initials(ca?.full_name || null)}</AvatarFallback></Avatar>
                                <div className="flex-1 bg-muted/30 rounded-lg px-3 py-2">
                                  <p className="text-xs font-semibold">{ca?.full_name || "User"}</p>
                                  <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                                </div>
                              </div>
                            );
                          })}
                          <div className="flex gap-2">
                            <Input
                              placeholder="Write a comment..."
                              value={commentDraft[p.id] || ""}
                              onChange={(e) => setCommentDraft(prev => ({ ...prev, [p.id]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === "Enter") submitComment(p.id); }}
                              maxLength={1000}
                            />
                            <Button size="sm" onClick={() => submitComment(p.id)}><Send className="w-4 h-4" /></Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )
        }
      </main>
    </div>
  );
};

export default CommunityWall;
