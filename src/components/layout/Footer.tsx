import { forwardRef } from "react";
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

const Footer = forwardRef<HTMLElement>((props, ref) => {
  return (
    <footer ref={ref} className="relative overflow-hidden" {...props}>
      {/* Gold gradient top border */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      
      <div className="bg-[hsl(30,15%,10%)] text-[hsl(40,20%,90%)]">
        <div className="container mx-auto px-4 py-16">
          {/* Newsletter */}
          <div className="max-w-4xl mx-auto mb-16 p-8 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/15">
            <div className="text-center mb-6">
              <h3 className="font-display text-2xl md:text-3xl font-bold mb-2">Stay Updated</h3>
              <p className="text-[hsl(40,20%,70%)]">Get the latest study tips, exam updates, and feature announcements.</p>
            </div>
            <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Input 
                type="email" 
                placeholder="Enter your email" 
                className="bg-white/10 border-white/15 text-white placeholder:text-white/40 focus:border-primary"
              />
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground whitespace-nowrap font-semibold">
                Subscribe
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-6 gap-8">
            {/* Brand */}
            <div className="col-span-2">
              <a href="/" className="flex items-center mb-6">
                <img src={logo} alt="OverraPrep AI FUTA" className="h-10 w-auto object-contain" />
              </a>
              <p className="text-[hsl(40,20%,65%)] mb-6 max-w-sm leading-relaxed text-sm">
                AI-powered CBT exam preparation platform helping FUTA students achieve academic excellence through smart practice.
              </p>
              
              <div className="flex items-center gap-2 mb-6">
                {socialLinks.map((social, i) => (
                  <a key={i} href={social.href} aria-label={social.label}
                    className="w-9 h-9 rounded-full bg-white/8 hover:bg-primary/30 flex items-center justify-center transition-colors">
                    <social.icon className="w-4 h-4" />
                  </a>
                ))}
              </div>

              <div className="space-y-2.5">
                {[
                  { icon: Mail, text: "info.overraaisolutions@gmail.com" },
                  { icon: Phone, text: "+234 8145 4725 86" },
                  { icon: MapPin, text: "Akure, Ondo State, Nigeria" },
                ].map(({ icon: Icon, text }, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-[hsl(40,20%,60%)]">
                    <Icon className="w-4 h-4 text-primary/70" />
                    <span className="text-xs">{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Link columns */}
            {Object.entries(footerLinks).map(([key, links]) => (
              <div key={key}>
                <h4 className="font-display font-semibold text-sm mb-4 capitalize">{key}</h4>
                <ul className="space-y-2.5">
                  {links.map((link) => (
                    <li key={link.name}>
                      <a href={link.href} className="text-[hsl(40,20%,60%)] hover:text-primary transition-colors text-sm">
                        {link.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[hsl(40,20%,50%)] text-xs">
              © {new Date().getFullYear()} OverraPrep AI. All rights reserved.
            </p>
            <div className="flex items-center gap-2 text-[hsl(40,20%,50%)] text-xs">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span>Powered by AI for Academic Excellence</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";
export default Footer;
