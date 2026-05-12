import React from "react";
import { Link } from "react-router";
import { LogoWordmark, ThemeToggle } from "../components/Logo";

export default function PrivacyPolicy() {
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
        <h1 className="text-4xl font-extrabold mb-8 text-foreground">Privacy Policy</h1>
        
        <div className="prose prose-invert max-w-none text-muted-foreground space-y-6">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">1. Introduction</h2>
          <p>
            Welcome to InterviewIQ. We respect your privacy and are committed to protecting your personal data. 
            This privacy policy will inform you about how we look after your personal data when you visit our 
            website and tell you about your privacy rights and how the law protects you.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">2. Data We Collect</h2>
          <p>
            We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Identity Data</strong> includes first name, last name, username or similar identifier.</li>
            <li><strong>Contact Data</strong> includes email address.</li>
            <li><strong>Technical Data</strong> includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location, browser plug-in types and versions, operating system and platform, and other technology on the devices you use to access this website.</li>
            <li><strong>Usage Data</strong> includes information about how you use our website, products and services (e.g. interview recordings, transcripts, and scores).</li>
          </ul>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">3. How We Use Your Data</h2>
          <p>
            We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Where we need to perform the contract we are about to enter into or have entered into with you (e.g., providing interview feedback).</li>
            <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
            <li>Where we need to comply with a legal obligation.</li>
          </ul>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">4. Data Security</h2>
          <p>
            We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">5. Third-Party Services and Advertising</h2>
          <p>
            We use third-party services like Google AdSense to serve ads when you visit our website. These companies may use aggregated information (not including your name, address, email address, or telephone number) about your visits to this and other websites in order to provide advertisements about goods and services of interest to you.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">6. Contact Us</h2>
          <p>
            If you have any questions about this privacy policy or our privacy practices, please contact us via our support channels.
          </p>
        </div>
      </main>

      <footer className="border-t border-border/40 py-8 text-center text-muted-foreground bg-background mt-auto">
        <p className="text-sm">© {new Date().getFullYear()} InterviewIQ. All rights reserved.</p>
      </footer>
    </div>
  );
}
