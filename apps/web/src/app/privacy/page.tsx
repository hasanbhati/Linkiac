import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Lock, Trash2, Mail, ExternalLink } from 'lucide-react';
import { LinkiacLogo } from '@/components/LinkiacLogo';

export const metadata = {
  title: 'Privacy Policy — Linkiac',
  description: 'Learn how Linkiac protects your personal data, privacy, and bookmarks with strict European GDPR standards.',
};

export default function PrivacyPolicyPage() {
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
            <ShieldCheck size={14} />
            <span>Privacy & Data Protection</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#111827]">
            Privacy Policy
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
              1. Introduction & Our Commitment
            </h2>
            <p>
              Welcome to <strong>Linkiac</strong> (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;), available at{' '}
              <strong>linkiac.eu</strong> and our mobile applications. Linkiac was built on the principle that your
              personal bookmarks, curated links, and reading habits are your private property.
            </p>
            <p>
              We are committed to full compliance with the European General Data Protection Regulation (GDPR) and
              global privacy best practices. <strong>We do not sell your personal data or browsing history to data brokers or advertisers.</strong>
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827]">
              2. Data We Collect
            </h2>
            <p>We only collect information strictly necessary to provide the service:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Account Credentials:</strong> Email address, username, and hashed passwords when registering
                via email, or verified authentication tokens when signing in with Apple or Google.
              </li>
              <li>
                <strong>Profile Details:</strong> Display name and optional avatar URL provided by you or your OAuth
                provider.
              </li>
              <li>
                <strong>Saved Bookmarks & Content:</strong> URLs you submit, page titles, descriptions, auto-fetched
                Open Graph preview thumbnails, nested folder structures, reading progress statuses (To Read, Reading, Done),
                and private notes.
              </li>
              <li>
                <strong>Friend Recommendations:</strong> User IDs of accepted friends and suggestions sent or received
                in your private Inbox.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827]">
              3. How We Use Your Information
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>To provide, synchronize, and persist your personal bookmark library across Web and Mobile.</li>
              <li>To fetch Open Graph metadata (titles, preview images) on your behalf when you save external web links.</li>
              <li>To allow private, end-user authorized link recommendations between accepted friends.</li>
              <li>To maintain the security, uptime, and integrity of the application.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827]">
              4. Sub-processors & Infrastructure
            </h2>
            <p>
              We partner with trusted infrastructure providers that adhere to rigorous security standards:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Supabase (PostgreSQL & Auth):</strong> Manages secure user authentication, token verification,
                and database persistence. All database access is protected by PostgreSQL Row Level Security (RLS).
              </li>
              <li>
                <strong>Apple & Google:</strong> Optional identity providers when you choose to use &quot;Sign in with Apple&quot; or &quot;Continue with Google&quot;.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827]">
              5. Right to Erasure & Account Deletion
            </h2>
            <p>
              Under GDPR Article 17, you have the absolute right to be forgotten. You can permanently delete your
              entire account and all associated data at any time directly within the application:
            </p>
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200/80 text-red-900 space-y-2">
              <div className="font-bold flex items-center gap-2">
                <Trash2 size={18} className="text-red-600" />
                <span>Immediate Permanent Deletion</span>
              </div>
              <p className="text-xs sm:text-sm text-red-800">
                Navigating to <strong>Settings &gt; Delete Account</strong> permanently removes your user profile, all saved
                bookmarks, nested folders, categories, friend connections, and inbox suggestions via a secure PostgreSQL
                transaction. This action is irreversible.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827]">
              6. Your Rights Under European Law (GDPR)
            </h2>
            <p>As a European or global user of linkiac.eu, you enjoy the following rights:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Right of Access:</strong> Request a copy of all personal data held about you.</li>
              <li><strong>Right to Portability:</strong> Export all your bookmarks and folders anytime in standard Netscape HTML format via Settings.</li>
              <li><strong>Right to Rectification:</strong> Update your profile, email, or credentials anytime.</li>
              <li><strong>Right to Object:</strong> Object to processing or lodge a complaint with your supervisory data protection authority.</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827]">
              7. Contact Us
            </h2>
            <p>
              For any questions, requests, or concerns regarding your privacy or data protection, please contact our
              designated data protection team:
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
            <Link href="/cookies" className="hover:text-[#093329] transition-colors">
              Cookie Policy
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
