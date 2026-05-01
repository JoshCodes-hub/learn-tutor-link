import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, LogIn, Sparkles, Star } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import amb1 from "@/assets/ambassadors/ambassador-1.jpg";
import amb2 from "@/assets/ambassadors/ambassador-2.jpg";
import amb3 from "@/assets/ambassadors/ambassador-3.jpg";
import amb4 from "@/assets/ambassadors/ambassador-4.jpg";

const AMBASSADORS = [
  { src: amb1, name: "Adaeze O.", school: "FUTA · Computer Science", quote: "I went from 45% to 82% in two months." },
  { src: amb2, name: "Tunde A.", school: "FUTA · Mechanical Eng.", quote: "OverraPrep made revising actually fun." },
  { src: amb3, name: "Chiamaka E.", school: "FUTA · Biochemistry", quote: "The AI tutor explains like a real teacher." },
  { src: amb4, name: "Ibrahim Y.", school: "FUTA · Civil Eng.", quote: "I study smarter — not longer." },
];

const ROTATE_MS = 3500;

const Ambassadors = () => {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % AMBASSADORS.length), ROTATE_MS);
    return () => clearInterval(t);
  }, []);

  // Preload next image for smooth swap
  useEffect(() => {
    const next = (idx + 1) % AMBASSADORS.length;
    const img = new Image();
    img.src = AMBASSADORS[next].src;
  }, [idx]);

  const current = AMBASSADORS[idx];

  return (
    <>
      <SEO title="Meet Our Ambassadors" description="Real students, real results. Join the OverraPrep community." url="/" />
      <div
        className="relative min-h-[100dvh] bg-background overflow-hidden flex flex-col"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
        }}
      >
        {/* Ambient gold halos */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -right-24 w-[22rem] h-[22rem] rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute top-1/2 -left-24 w-[18rem] h-[18rem] rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(43_78%_52%/0.10),transparent_55%)]" />
        </div>

        {/* Top bar */}
        <header className="relative z-10 mx-auto w-full max-w-md px-5 pt-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logo} alt="OverraPrep AI" width={32} height={32} className="w-8 h-8 object-contain" />
            <p className="font-bold text-[15px] tracking-tight text-foreground">
              OverraPrep
              <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-md border border-primary/40 text-[10px] font-bold text-primary">
                AI
              </span>
            </p>
          </div>
          <button
            onClick={() => navigate("/auth?mode=signin")}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Sign in
          </button>
        </header>

        {/* Hero copy */}
        <section className="relative z-10 mx-auto w-full max-w-md px-5 pt-5 text-center">
          <motion.span
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/25 mb-3"
          >
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-semibold tracking-wider uppercase text-primary">
              Meet Our Ambassadors
            </span>
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-[26px] leading-[1.1] font-bold tracking-tight text-foreground"
          >
            Real students.{" "}
            <span className="bg-gradient-to-r from-[hsl(43_85%_50%)] to-[hsl(38_75%_45%)] bg-clip-text text-transparent">
              Real results.
            </span>
          </motion.h1>
        </section>

        {/* Image stage */}
        <section className="relative z-10 mx-auto w-full max-w-md px-5 mt-5 flex-1">
          <div className="relative w-full aspect-[3/4] max-h-[58vh] rounded-[28px] overflow-hidden bg-gradient-to-br from-amber-100/60 via-white to-amber-50 border border-primary/20 shadow-2xl shadow-primary/10">
            {/* Soft gold backdrop visible through transparent edges */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(45_88%_75%/0.35),transparent_60%)]" />

            <AnimatePresence mode="wait">
              <motion.img
                key={idx}
                src={current.src}
                alt={`${current.name}, OverraPrep ambassador`}
                width={768}
                height={1024}
                className="absolute inset-0 w-full h-full object-cover object-center"
                initial={{ opacity: 0, scale: 1.06, x: 30 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.98, x: -30 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              />
            </AnimatePresence>

            {/* Bottom info gradient */}
            <div className="absolute inset-x-0 bottom-0 p-4 pt-14 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
              <AnimatePresence mode="wait">
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.45 }}
                  className="text-white"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-200">
                      Ambassador
                    </span>
                  </div>
                  <p className="font-bold text-[16px] leading-tight">{current.name}</p>
                  <p className="text-[11px] text-white/80">{current.school}</p>
                  <p className="mt-1.5 text-[12px] italic text-white/95">"{current.quote}"</p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Dots */}
          <div className="mt-4 flex items-center justify-center gap-2">
            {AMBASSADORS.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`Show ambassador ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === idx ? "w-6 bg-primary" : "w-1.5 bg-primary/30"
                }`}
              />
            ))}
          </div>
        </section>

        {/* CTAs */}
        <section
          className="relative z-10 mx-auto w-full max-w-md px-5 pt-5 space-y-2.5"
          style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
        >
          <Button
            onClick={() => navigate("/start/persona")}
            className="w-full h-12 rounded-full font-semibold text-[15px] bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30"
          >
            I'm New — Get Started
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
          <Button
            onClick={() => navigate("/auth?mode=signin")}
            variant="outline"
            className="w-full h-12 rounded-full font-semibold text-[15px] border-2 border-primary/40 hover:bg-primary/5"
          >
            <LogIn className="w-4 h-4 mr-1.5" />
            I already have an account
          </Button>
          <button
            onClick={() => navigate("/welcome-tour")}
            className="w-full text-center text-[12px] text-muted-foreground hover:text-primary transition pt-1"
          >
            Learn more about OverraPrep →
          </button>
        </section>
      </div>
    </>
  );
};

export default Ambassadors;
