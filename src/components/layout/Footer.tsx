import { Mail, Phone, MapPin, ArrowRight, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import logo from "@/assets/logo.png";

const footerLinks = {
  product: [
    { name: "Features", href: "#features" },
    { name: "How It Works", href: "#how-it-works" },
    { name: "Pricing", href: "#pricing" },
    { name: "For Tutors", href: "#become-tutor" },
  ],
  resources: [
    { name: "Past Questions", href: "#" },
    { name: "Study Guides", href: "#" },
    { name: "Blog", href: "#" },
    { name: "Help Center", href: "#" },
  ],
  company: [
    { name: "About Us", href: "#" },
    { name: "Careers", href: "#" },
    { name: "Contact", href: "#" },
    { name: "Partners", href: "#" },
  ],
  legal: [
    { name: "Privacy Policy", href: "#" },
    { name: "Terms of Service", href: "#" },
    { name: "Cookie Policy", href: "#" },
  ],
};

const socialLinks = [
  { icon: Facebook, href: "#", label: "Facebook" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
];

const Footer = () => {
  return (
    <footer className="relative overflow-hidden">
      {/* Gradient top border */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      
      <div className="bg-foreground text-background">
        <div className="container mx-auto px-4 py-16">
          {/* Newsletter Section */}
          <div className="max-w-4xl mx-auto mb-16 p-8 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/10">
            <div className="text-center mb-6">
              <h3 className="font-display text-2xl md:text-3xl font-bold text-background mb-2">
                Stay Updated
              </h3>
              <p className="text-background/70">
                Get the latest study tips, exam updates, and feature announcements.
              </p>
            </div>
            <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Input 
                type="email" 
                placeholder="Enter your email" 
                className="bg-background/10 border-background/20 text-background placeholder:text-background/50 focus:border-primary"
              />
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground whitespace-nowrap">
                Subscribe
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-6 gap-8 lg:gap-8">
            {/* Brand Column */}
            <div className="col-span-2 lg:col-span-2">
              <a href="/" className="flex items-center mb-6">
                <img 
                  src={logo} 
                  alt="OverraPrep AI FUTA" 
                  className="h-10 w-auto object-contain"
                />
              </a>
              <p className="text-background/70 mb-6 max-w-sm leading-relaxed">
                AI-powered CBT exam preparation platform helping FUTA students 
                achieve academic excellence through smart practice.
              </p>
              
              {/* Social Links */}
              <div className="flex items-center gap-3 mb-6">
                {socialLinks.map((social, i) => (
                  <a
                    key={i}
                    href={social.href}
                    aria-label={social.label}
                    className="w-10 h-10 rounded-full bg-background/10 hover:bg-primary/80 flex items-center justify-center transition-colors"
                  >
                    <social.icon className="w-4 h-4 text-background" />
                  </a>
                ))}
              </div>

              {/* Contact Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-background/70">
                  <div className="w-8 h-8 rounded-full bg-background/10 flex items-center justify-center">
                    <Mail className="w-4 h-4" />
                  </div>
                  <span className="text-sm">support@overraprep.com</span>
                </div>
                <div className="flex items-center gap-3 text-background/70">
                  <div className="w-8 h-8 rounded-full bg-background/10 flex items-center justify-center">
                    <Phone className="w-4 h-4" />
                  </div>
                  <span className="text-sm">+234 800 000 0000</span>
                </div>
                <div className="flex items-center gap-3 text-background/70">
                  <div className="w-8 h-8 rounded-full bg-background/10 flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span className="text-sm">Akure, Ondo State, Nigeria</span>
                </div>
              </div>
            </div>

            {/* Links Columns */}
            <div>
              <h4 className="font-display font-semibold text-background mb-4">Product</h4>
              <ul className="space-y-3">
                {footerLinks.product.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-background/70 hover:text-background transition-colors text-sm inline-flex items-center gap-1 group"
                    >
                      {link.name}
                      <ArrowRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-display font-semibold text-background mb-4">Resources</h4>
              <ul className="space-y-3">
                {footerLinks.resources.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-background/70 hover:text-background transition-colors text-sm inline-flex items-center gap-1 group"
                    >
                      {link.name}
                      <ArrowRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-display font-semibold text-background mb-4">Company</h4>
              <ul className="space-y-3">
                {footerLinks.company.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-background/70 hover:text-background transition-colors text-sm inline-flex items-center gap-1 group"
                    >
                      {link.name}
                      <ArrowRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-display font-semibold text-background mb-4">Legal</h4>
              <ul className="space-y-3">
                {footerLinks.legal.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-background/70 hover:text-background transition-colors text-sm inline-flex items-center gap-1 group"
                    >
                      {link.name}
                      <ArrowRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 pt-8 border-t border-background/10 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-background/60 text-sm">
              © {new Date().getFullYear()} OverraPrep AI. All rights reserved.
            </p>
            <div className="flex items-center gap-2 text-background/60 text-sm">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span>Powered by AI for Academic Excellence</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
