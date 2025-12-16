import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, GraduationCap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import TutorApplicationDialog from "@/components/landing/TutorApplicationDialog";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import logo from "@/assets/logo.png";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showTutorDialog, setShowTutorDialog] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading, hasRole } = useAuth();

  const navLinks = [
    { name: "Features", href: "#features" },
    { name: "How It Works", href: "#how-it-works" },
    { name: "Tutors", href: "/tutors", isRoute: true },
    { name: "For Tutors", href: "#become-tutor" },
    { name: "FAQ", href: "#faq" },
  ];

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    
    // If not on home page, navigate there first
    if (location.pathname !== "/") {
      navigate("/");
      // Wait for navigation then scroll
      setTimeout(() => {
        const element = document.querySelector(href);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    } else {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
    setIsMenuOpen(false);
  };

  // Don't show "Become a Tutor" if user is already a tutor or admin
  const showTutorButton = !hasRole("tutor") && !hasRole("admin");

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center group">
              <img 
                src={logo} 
                alt="OverraPrep AI FUTA" 
                className="h-10 w-auto object-contain"
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                link.isRoute ? (
                  <Link
                    key={link.name}
                    to={link.href}
                    className="text-muted-foreground hover:text-foreground font-medium transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                ) : (
                  <a
                    key={link.name}
                    href={link.href}
                    onClick={(e) => handleSmoothScroll(e, link.href)}
                    className="text-muted-foreground hover:text-foreground font-medium transition-colors duration-200 cursor-pointer"
                  >
                    {link.name}
                  </a>
                )
              ))}
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-3">
              {showTutorButton && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowTutorDialog(true)}
                  className="gap-1.5"
                >
                  <GraduationCap className="w-4 h-4" />
                  Become a Tutor
                </Button>
              )}
              {!isLoading && (
                user ? (
                  <>
                    <NotificationCenter />
                    <Button variant="hero" size="sm" onClick={() => navigate("/dashboard")}>
                      Go to Dashboard
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
                      Sign In
                    </Button>
                    <Button variant="hero" size="sm" onClick={() => navigate("/auth")}>
                      Get Started Free
                    </Button>
                  </>
                )
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-foreground"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-border animate-fade-in">
              <div className="flex flex-col gap-4">
                {navLinks.map((link) => (
                  link.isRoute ? (
                    <Link
                      key={link.name}
                      to={link.href}
                      className="text-muted-foreground hover:text-foreground font-medium transition-colors duration-200 py-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {link.name}
                    </Link>
                  ) : (
                    <a
                      key={link.name}
                      href={link.href}
                      onClick={(e) => handleSmoothScroll(e, link.href)}
                      className="text-muted-foreground hover:text-foreground font-medium transition-colors duration-200 py-2 cursor-pointer"
                    >
                      {link.name}
                    </a>
                  )
                ))}
                <div className="flex flex-col gap-2 pt-4 border-t border-border">
                  {showTutorButton && (
                    <Button 
                      variant="outline" 
                      className="w-full justify-center gap-1.5" 
                      onClick={() => { setIsMenuOpen(false); setShowTutorDialog(true); }}
                    >
                      <GraduationCap className="w-4 h-4" />
                      Become a Tutor
                    </Button>
                  )}
                  {user ? (
                    <div className="flex items-center gap-2">
                      <NotificationCenter />
                      <Button variant="hero" className="flex-1 justify-center" onClick={() => navigate("/dashboard")}>
                        Go to Dashboard
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button variant="ghost" className="w-full justify-center" onClick={() => navigate("/auth")}>
                        Sign In
                      </Button>
                      <Button variant="hero" className="w-full justify-center" onClick={() => navigate("/auth")}>
                        Get Started Free
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      <TutorApplicationDialog 
        open={showTutorDialog} 
        onOpenChange={setShowTutorDialog} 
      />
    </>
  );
};

export default Navbar;