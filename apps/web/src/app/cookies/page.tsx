import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Cookie, CheckCircle2, ShieldCheck, Mail } from 'lucide-react';
import { LinkiacLogo } from '@/components/LinkiacLogo';

export const metadata = {
  title: 'Cookie Policy — Linkiac',
  description: 'Understand how Linkiac uses essential cookies strictly for secure session management and authentication.',
};

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827] flex flex-col selection:bg-[#BCD94E] selection:text-[#093329]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#F9FAFB]/90 backdrop-blur-md border-b border-gray-200/80 px-4 sm:px-8 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center group">
            <LinkiacLogo height={38} className="group-hover:scale-[1.02] transition-transform" />
          </Link>

          <Link
            href="/"
            className="text-xs sm:text-sm font-semibold text-gray-600 hover:text-[#093329] flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-12 sm:py-16 space-y-8 flex-1 w-full">
        {/* Title Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#BCD94E]/25 border border-[#BCD94E]/40 text-[#093329] text-xs font-bold uppercase tracking-wider">
            <Cookie size={14} />
            <span>Transparent Tracking Policy</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#111827]">
            Cookie Policy
          </h1>
          <p className="text-sm sm:text-base text-gray-500 font-normal">
            Effective Date: September 11, 2026 • Domain: <strong>linkiac.eu</strong>
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-white rounded-3xl p-6 sm:p-12 border border-gray-200/80 shadow-sm space-y-10 text-sm sm:text-base text-gray-700 leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827]">
              1. What Are Cookies?
            </h2>
            <p>
              Cookies are small text files that are stored on your device (computer, tablet, or mobile phone) when
              you visit a website. They are widely used to make web applications work efficiently and securely.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827]">
              2. Our Privacy-First Commitment
            </h2>
            <div className="p-4.5 rounded-2xl bg-[#BCD94E]/15 border border-[#BCD94E]/40 text-[#093329] space-y-2">
              <div className="font-bold flex items-center gap-2">
                <CheckCircle2 size={18} className="text-[#093329]" />
                <span>Zero Third-Party Advertising Trackers</span>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed">
                Linkiac is built for privacy. <strong>We do not use advertising cookies, social media tracking pixels, or cross-site analytics brokers.</strong>
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827]">
              3. Strictly Necessary Cookies
            </h2>
            <p>
              Under the EU ePrivacy Directive and GDPR, strictly necessary cookies do not require prior consent because
              the service cannot function without them. Linkiac uses the following essential cookies:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border border-gray-200 rounded-xl overflow-hidden">
                <thead className="bg-gray-50 text-gray-700 border-b border-gray-200 font-semibold">
                  <tr>
                    <th className="p-3">Cookie Name</th>
                    <th className="p-3">Provider</th>
                    <th className="p-3">Purpose</th>
                    <th className="p-3">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="p-3 font-mono font-bold text-[#093329]">sb-access-token</td>
                    <td className="p-3">Supabase / Linkiac</td>
                    <td className="p-3">Authenticates your active user session securely.</td>
                    <td className="p-3">Session / 1 Hour</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-[#093329]">sb-refresh-token</td>
                    <td className="p-3">Supabase / Linkiac</td>
                    <td className="p-3">Allows automatic, seamless renewal of expired authentication tokens.</td>
                    <td className="p-3">Persistent (up to 30 days)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827]">
              4. Local Storage
            </h2>
            <p>
              In addition to cookies, Linkiac uses HTML5 Local Storage exclusively to remember local interface
              preferences (such as your chosen folder view modes or search filters) so you don&apos;t have to reset them
              every time you navigate between pages.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827]">
              5. How to Manage or Disable Cookies
            </h2>
            <p>
              You can control or delete cookies at any time through your browser settings. However, please note that
              because Linkiac only uses strictly necessary authentication cookies, disabling them will prevent you
              from staying signed into your account.
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-gray-600">
              <li>Google Chrome: Settings &gt; Privacy and Security &gt; Cookies and other site data</li>
              <li>Apple Safari: Preferences &gt; Privacy &gt; Manage Website Data</li>
              <li>Mozilla Firefox: Settings &gt; Privacy &amp; Security &gt; Cookies and Site Data</li>
              <li>Microsoft Edge: Settings &gt; Cookies and site permissions</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827]">
              6. Questions & Contact
            </h2>
            <p>
              If you have any questions about our use of cookies or privacy standards, please reach out to us:
            </p>
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex items-center gap-3">
              <Mail className="text-[#093329]" size={20} />
              <span className="font-semibold text-[#111827]">privacy@linkiac.eu</span>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200/80 bg-white py-8 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500 font-medium">
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-[#093329] transition-colors">
              Home
            </Link>
            <Link href="/privacy" className="hover:text-[#093329] transition-colors">
              Privacy Policy
            </Link>
            <Link href="/login" className="hover:text-[#093329] transition-colors">
              Log In
            </Link>
          </div>
          <p>&copy; {new Date().getFullYear()} Linkiac (linkiac.eu). All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
