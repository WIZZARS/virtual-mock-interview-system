import React, { useState } from "react";
import { Code2, ChevronUp, ChevronDown, Copy, CheckCircle2, ExternalLink, ShieldCheck } from "lucide-react";

export default function SiteVerification() {
  const [isOpen, setIsOpen] = useState(true);
  const [method, setMethod] = useState<'adsense' | 'adstxt' | 'meta'>('adsense');
  const [isPlaced, setIsPlaced] = useState(false);
  const [copied, setCopied] = useState(false);

  const adsenseCode = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3845274046500379"
     crossorigin="anonymous"></script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(adsenseCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-border bg-card overflow-hidden transition-all duration-200">
      {/* Header */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-primary/5 rounded-sm border border-primary/10">
            <ShieldCheck className="w-4 h-4 text-primary" />
          </div>
          <span className="font-bold tracking-tight text-sm uppercase">Verify site ownership</span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {isOpen && (
        <div className="p-6 border-t border-border animate-fadeIn">
          <div className="space-y-6">
            {/* Method Selection */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Select verification method:</p>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="radio" 
                      name="method" 
                      className="peer appearance-none w-4 h-4 border border-border rounded-none checked:border-primary transition-all"
                      checked={method === 'adsense'}
                      onChange={() => setMethod('adsense')}
                    />
                    <div className="absolute w-2 h-2 bg-primary opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                  </div>
                  <span className={`text-sm font-medium ${method === 'adsense' ? 'text-foreground' : 'text-muted-foreground'}`}>AdSense code snippet</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="radio" 
                      name="method" 
                      className="peer appearance-none w-4 h-4 border border-border rounded-none checked:border-primary transition-all"
                      checked={method === 'adstxt'}
                      onChange={() => setMethod('adstxt')}
                    />
                    <div className="absolute w-2 h-2 bg-primary opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                  </div>
                  <span className={`text-sm font-medium ${method === 'adstxt' ? 'text-foreground' : 'text-muted-foreground'}`}>Ads.txt snippet</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="radio" 
                      name="method" 
                      className="peer appearance-none w-4 h-4 border border-border rounded-none checked:border-primary transition-all"
                      checked={method === 'meta'}
                      onChange={() => setMethod('meta')}
                    />
                    <div className="absolute w-2 h-2 bg-primary opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                  </div>
                  <span className={`text-sm font-medium ${method === 'meta' ? 'text-foreground' : 'text-muted-foreground'}`}>Meta tag</span>
                </label>
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground leading-relaxed">
                To get your site ready to show ads, copy and paste this code between the <code className="bg-muted px-1.5 py-0.5 rounded-sm text-foreground font-mono text-[11px]">&lt;head&gt;</code><code className="bg-muted px-1.5 py-0.5 rounded-sm text-foreground font-mono text-[11px]">&lt;/head&gt;</code> tags on each page of your site. 
                <a href="#" className="text-primary hover:underline inline-flex items-center gap-1 ml-1 font-medium">Learn more about the AdSense code <ExternalLink className="w-3 h-3" /></a>
              </p>
            </div>

            {/* Code Box */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Your AdSense code</p>
              <div className="relative group">
                <pre className="bg-muted/50 border border-border p-4 font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed text-foreground">
                  {adsenseCode}
                </pre>
                <button 
                  onClick={handleCopy}
                  className="absolute top-3 right-3 p-2 bg-background border border-border hover:bg-muted transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-tight"
                >
                  {copied ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-border gap-4">
              <label className="flex items-center gap-3 cursor-pointer self-start sm:self-center">
                <div className="relative flex items-center justify-center">
                  <input 
                    type="checkbox" 
                    className="peer appearance-none w-5 h-5 border border-border rounded-none checked:border-primary transition-all"
                    checked={isPlaced}
                    onChange={(e) => setIsPlaced(e.target.checked)}
                  />
                  <div className="absolute w-2.5 h-2.5 bg-primary opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                </div>
                <span className="text-sm font-bold">I've placed the code</span>
              </label>

              <button 
                disabled={!isPlaced}
                className={`w-full sm:w-auto px-8 py-3 font-black text-sm uppercase tracking-widest transition-all ${
                  isPlaced 
                    ? 'bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]' 
                    : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                }`}
              >
                Verify
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
