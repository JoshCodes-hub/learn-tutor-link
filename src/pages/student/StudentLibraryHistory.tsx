import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/layout/Navbar";
import { SEO } from "@/components/seo/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { fetchBookmarks, fetchDownloadHistory } from "@/lib/studentLibrary";
import { Bookmark, Download, FileText, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

const StudentLibraryHistory = () => {
  const { user, isLoading } = useAuth();
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([fetchBookmarks(user.id), fetchDownloadHistory(user.id)])
      .then(([b, h]) => { setBookmarks(b); setHistory(h); })
      .finally(() => setLoading(false));
  }, [user]);

  if (isLoading || loading) {
    return <div className="min-h-screen bg-background"><Navbar /><div className="flex justify-center pt-32"><LoadingSpinner /></div></div>;
  }

  const Row = ({ item, icon }: { item: any; icon: React.ReactNode }) => (
    <li className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-amber-50/50 border border-transparent hover:border-amber-100">
      <div className="flex items-center gap-2 min-w-0">
        {icon}
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{item.title || item.resource_id}</p>
          <p className="text-[11px] text-muted-foreground">
            {item.resource_type} · {item.level || "any level"} · {format(new Date(item.created_at), "MMM d, HH:mm")}
          </p>
        </div>
      </div>
      {item.course_id && (
        <Link to={`/study-hub/${item.course_id}`} className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 shrink-0">
          Open →
        </Link>
      )}
    </li>
  );

  return (
    <>
      <SEO title="My Library & History" description="Your saved materials and download history." noindex url="https://overraprep.com/student/library-history" />
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-8">
          <h1 className="font-display text-2xl font-bold mb-6">My Library & History</h1>
          <Tabs defaultValue="bookmarks">
            <TabsList>
              <TabsTrigger value="bookmarks"><Bookmark className="w-4 h-4 mr-1.5" />Bookmarks</TabsTrigger>
              <TabsTrigger value="history"><Download className="w-4 h-4 mr-1.5" />Downloads</TabsTrigger>
            </TabsList>
            <TabsContent value="bookmarks">
              <Card><CardHeader><CardTitle className="text-base">Saved for later</CardTitle></CardHeader>
                <CardContent>
                  {bookmarks.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">No bookmarks yet — tap the bookmark icon on any material or quiz.</p>
                  ) : (
                    <ul className="space-y-1">
                      {bookmarks.map((b) => (
                        <Row key={b.id} item={b} icon={b.resource_type === "quiz" ? <ClipboardList className="w-4 h-4 text-amber-600" /> : <FileText className="w-4 h-4 text-amber-600" />} />
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="history">
              <Card><CardHeader><CardTitle className="text-base">Recently downloaded</CardTitle></CardHeader>
                <CardContent>
                  {history.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">No downloads yet.</p>
                  ) : (
                    <ul className="space-y-1">
                      {history.map((h) => (
                        <Row key={h.id} item={h} icon={<Download className="w-4 h-4 text-amber-600" />} />
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </>
  );
};

export default StudentLibraryHistory;
