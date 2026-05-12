import React from "react";
import { Link } from "react-router";
import { LogoWordmark, ThemeToggle } from "../components/Logo";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="border-b border-border/40 px-6 md:px-8 py-4 flex justify-between items-center glass-strong sticky top-0 z-50">
        <LogoWordmark size={52} />
        <div className="flex items-center gap-5">
          <ThemeToggle />
          <Link to="/" className="text-sm font-medium hover:text-primary transition-colors text-muted-foreground">
            Home
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12">
        <h1 className="text-4xl font-extrabold mb-8 text-foreground">Terms of Service</h1>
        
        <div className="prose prose-invert max-w-none text-muted-foreground space-y-6">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">1. Agreement to Terms</h2>
          <p>
            By viewing or using this website, which can be accessed at InterviewIQ, you are agreeing to be bound by these website Terms and Conditions of Use and agree that you are responsible for the agreement with any applicable local laws. If you disagree with any of these terms, you are prohibited from accessing this site.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">2. Use License</h2>
          <p>
            Permission is granted to temporarily download one copy of the materials on InterviewIQ's Website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>modify or copy the materials;</li>
            <li>use the materials for any commercial purpose or for any public display;</li>
            <li>attempt to reverse engineer any software contained on InterviewIQ's Website;</li>
            <li>remove any copyright or other proprietary notations from the materials; or</li>
            <li>transfer the materials to another person or "mirror" the materials on any other server.</li>
          </ul>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">3. Disclaimer</h2>
          <p>
            All the materials on InterviewIQ's Website are provided "as is". InterviewIQ makes no warranties, may it be expressed or implied, therefore negates all other warranties. Furthermore, InterviewIQ does not make any representations concerning the accuracy or reliability of the use of the materials on its Website or otherwise relating to such materials or any sites linked to this Website.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">4. Limitations</h2>
          <p>
            InterviewIQ or its suppliers will not be hold accountable for any damages that will arise with the use or inability to use the materials on InterviewIQ's Website, even if InterviewIQ or an authorize representative of this Website has been notified, orally or written, of the possibility of such damage.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">5. Revisions and Errata</h2>
          <p>
            The materials appearing on InterviewIQ's Website may include technical, typographical, or photographic errors. InterviewIQ will not promise that any of the materials in this Website are accurate, complete, or current. InterviewIQ may change the materials contained on its Website at any time without notice.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">6. Links</h2>
          <p>
            InterviewIQ has not reviewed all of the sites linked to its Website and is not responsible for the contents of any such linked site. The presence of any link does not imply endorsement by InterviewIQ of the site. The use of any linked website is at the user's own risk.
          </p>
        </div>
      </main>

      <footer className="border-t border-border/40 py-8 text-center text-muted-foreground bg-background mt-auto">
        <p className="text-sm">© {new Date().getFullYear()} InterviewIQ. All rights reserved.</p>
      </footer>
    </div>
  );
}
