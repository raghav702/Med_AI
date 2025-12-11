import { Heart, Mail, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="bg-secondary/30 border-t border-border mt-16">
      <div className="container mx-auto px-4 md:px-6 py-8 sm:py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg ai-gradient flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <span className="font-display font-bold text-lg text-foreground">MedAI</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your trusted platform for AI-powered health insights and connecting with medical professionals.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-display font-semibold text-foreground mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/ai-assistant" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  AI Assistant
                </Link>
              </li>
              <li>
                <Link to="/doctors" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Find Doctors
                </Link>
              </li>
              <li>
                <Link to="/appointments" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Appointments
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-display font-semibold text-foreground mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <span className="text-sm text-muted-foreground">HIPAA Compliant</span>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-display font-semibold text-foreground mb-4">Support</h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4" />
                <a href="mailto:support@medai.com" className="hover:text-foreground transition-colors">
                  support@medai.com
                </a>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>1-800-HEALTH</span>
              </li>
              <li>
                <Link to="/faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="border-t border-border pt-6">
          <p className="text-xs text-muted-foreground text-center leading-relaxed max-w-4xl mx-auto">
            <strong>Medical Disclaimer:</strong> Always discuss AI-generated health insights with a qualified healthcare provider. 
            Our AI assistant is designed to provide information and support, not to replace professional medical advice, diagnosis, or treatment. 
            In case of emergency, please call your local emergency services immediately.
          </p>
        </div>

        {/* Copyright */}
        <div className="border-t border-border mt-6 pt-6">
          <p className="text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()} MedAI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
