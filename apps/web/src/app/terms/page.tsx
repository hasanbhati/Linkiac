import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, ShieldAlert, CheckCircle, Trash2, Mail } from 'lucide-react';
import { LinkiacLogo } from '@/components/LinkiacLogo';

export const metadata = {
  title: 'Terms of Service & EULA — Linkiac',
  description: 'Terms of Service and End User License Agreement for Linkiac universal bookmarking and private recommendation service.',
};

export default function TermsOfServicePage() {
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
            <FileText size={14} />
            <span>Terms of Service & EULA</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#111827]">
            Terms of Service
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
              1. Acceptance of Terms & Eligibility
            </h2>
            <p>
              By accessing, installing, or using the <strong>Linkiac</strong> web application (available at{' '}
              <strong>linkiac.eu</strong>) or mobile applications, you enter into a binding legal agreement with Linkiac
              (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) governed by these Terms of Service and End User License
              Agreement (EULA).
            </p>
            <p>
              If you do not agree to these terms, do not install or use Linkiac. You must be at least 13 years of age
              (or 16 years of age within the European Union) to create an account and use the service.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827]">
              2. Description of the Service
            </h2>
            <p>
              Linkiac is a privacy-first universal link curator, bookmark manager, and private recommendation platform.
              Our core features include saving, tagging, organizing, and categorizing web hyperlinks, viewing reading status
              analytics, importing/exporting browser bookmark archives, and privately recommending links to accepted mutual
              friends.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827]">
              3. User Accounts & Security
            </h2>
            <p>
              To access personalized synchronization, you must register for an account using your email address, unique
              username, and secure password, or an authorized identity provider (Apple or Google).
            </p>
            <p>
              You are solely responsible for maintaining the confidentiality of your credentials and for all activities
              under your account. You agree to notify us immediately at <strong>support@linkiac.eu</strong> if you suspect
              any unauthorized access to your account.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] flex items-center gap-2">
              <ShieldAlert size={20} className="text-amber-600" />
              <span>4. Acceptable Use & Prohibited Conduct</span>
            </h2>
            <p>
              You agree not to use Linkiac to engage in any prohibited or unlawful conduct. Specifically, you may not:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Transmit or share links leading to malware, spyware, phishing scams, or computer viruses.
              </li>
              <li>
                Send unsolicited bulk spam, harassment, threats, or abusive messages to other users.
              </li>
              <li>
                Probe, scan, or test the vulnerability of our system or network (including SSRF attempts against internal IP addresses).
              </li>
              <li>
                Attempt to bypass or tamper with Row-Level Security (RLS) policies or impersonate another user or administrator.
              </li>
              <li>
                Post, transmit, or share content that is illegal, defamatory, obscene, invasive of privacy, or infringing upon third-party intellectual property rights.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827]">
              5. User-Generated Content, Reporting & Blocking (UGC Policy)
            </h2>
            <p>
              When you recommend a link to a friend or write a note, you retain ownership of the content you submit.
              However, Linkiac enforces a strict <strong>Zero-Tolerance Policy</strong> for objectionable material, spam, and abusive behavior.
            </p>
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-3">
              <div className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                <CheckCircle size={16} className="text-[#093329]" />
                <span>In-App Protection & Abuse Controls</span>
              </div>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-gray-600">
                <li>
                  <strong>Blocking Users:</strong> You can block any user at any time from their profile. Blocked users cannot send you link recommendations or friend requests.
                </li>
                <li>
                  <strong>Reporting Content:</strong> You can report any recommendation or personal note directly within your Inbox. Our moderation team reviews all reported content within 24 hours.
                </li>
                <li>
                  <strong>Account Penalties:</strong> Accounts found violating our community guidelines or sending spam/malicious links will be suspended or permanently terminated.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827]">
              6. Account Deletion & Right to Terminate
            </h2>
            <p>
              You have the right to terminate this agreement and delete your account at any time.
            </p>
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200/80 text-red-900 space-y-2">
              <div className="font-bold flex items-center gap-2">
                <Trash2 size={18} className="text-red-600" />
                <span>Self-Service Permanent Deletion</span>
              </div>
              <p className="text-xs sm:text-sm text-red-800">
                You can permanently delete your entire account and all stored links, folders, and friendships directly inside the app by visiting <strong>Settings &gt; Delete Account</strong>. All associated records are instantly and irreversibly erased.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827]">
              7. Intellectual Property & License
            </h2>
            <p>
              Linkiac and its design, logos, software, and brand assets are protected by copyright, trademark, and other
              applicable intellectual property laws. We grant you a limited, non-exclusive, non-transferable, revocable
              license to use the application for your personal, non-commercial link curation.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827]">
              8. Limitation of Liability & Warranty Disclaimer
            </h2>
            <p>
              Linkiac is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranties of any kind.
              We do not warrant that external third-party links saved in your library will remain online, valid, or free
              from changes made by their respective third-party publishers.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827]">
              9. Contact Information
            </h2>
            <p>
              If you have any questions, concerns, or legal inquiries regarding these Terms of Service or our User-Generated
              Content policies, please contact us at:
            </p>
            <div className="p-4 rounded-2xl bg-[#093329]/5 border border-[#093329]/15 flex items-center gap-3">
              <Mail className="text-[#093329] shrink-0" size={20} />
              <div className="text-xs sm:text-sm">
                <p className="font-bold text-[#093329]">Linkiac Legal & Safety Operations</p>
                <p className="text-gray-600">Email: <a href="mailto:support@linkiac.eu" className="underline font-semibold text-[#093329]">support@linkiac.eu</a></p>
                <p className="text-gray-500 font-mono text-[11px] mt-0.5">European Union • linkiac.eu</p>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200/80 bg-white py-8 px-4 sm:px-8 text-center text-xs text-gray-500">
        <p>&copy; {new Date().getFullYear()} Linkiac. All rights reserved. • <Link href="/privacy" className="hover:underline">Privacy Policy</Link> • <Link href="/cookies" className="hover:underline">Cookies</Link></p>
      </footer>
    </div>
  );
}
