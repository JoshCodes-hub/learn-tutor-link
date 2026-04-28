import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Compass, Home, ArrowLeft, Sparkles } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <>
      <SEO
        title="Page Not Found"
        description="The page you're looking for doesn't exist."
        noindex={true}
      />
      <main
        className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 px-6"
        role="main"
      >
        {/* Decorative background glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-amber-300/10 blur-3xl"
        />

        <motion.article
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative z-10 mx-auto max-w-xl text-center"
        >
          <motion.div
            initial={{ rotate: -10, scale: 0.8 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 180, damping: 14 }}
            className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full border border-primary/30 bg-primary/10 shadow-[0_0_60px_-10px_hsl(var(--primary)/0.5)]"
          >
            <Compass className="h-12 w-12 text-primary" />
          </motion.div>

          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1 text-xs font-medium uppercase tracking-widest text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Error 404
          </p>

          <h1 className="mb-4 font-serif text-5xl font-bold tracking-tight text-foreground md:text-6xl">
            You've wandered off the path
          </h1>
          <p className="mx-auto mb-8 max-w-md text-base text-muted-foreground md:text-lg">
            We couldn't find{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
              {location.pathname}
            </code>
            . The page may have moved, or the link might be incorrect.
          </p>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => window.history.back()}
              className="w-full sm:w-auto"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>
        </motion.article>
      </main>
    </>
  );
};

export default NotFound;
