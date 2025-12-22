import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';

interface PrivacyPolicyProps {
  onBack?: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          {onBack && (
            <button
              onClick={onBack}
              className="mb-6 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">
              Privacy Policy
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:text-slate-900 dark:prose-headings:text-slate-100 prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-strong:text-slate-900 dark:prose-strong:text-slate-100">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              1. Introduction
            </h2>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
              Welcome to LoadMaster ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our fleet management platform.
            </p>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              By using LoadMaster, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              2. Information We Collect
            </h2>
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-3 mt-6">
              2.1 Personal Information
            </h3>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
              We collect information that you provide directly to us, including:
            </p>
            <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-2 mb-4 ml-4">
              <li>Name, email address, and phone number</li>
              <li>Company information and business details</li>
              <li>Payment and billing information</li>
              <li>Account credentials and authentication data</li>
            </ul>

            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-3 mt-6">
              2.2 Usage Data
            </h3>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
              We automatically collect information about how you use our service, including:
            </p>
            <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-2 mb-4 ml-4">
              <li>Load and shipment data</li>
              <li>Driver and vehicle information</li>
              <li>Dispatch and routing data</li>
              <li>Device information and IP addresses</li>
              <li>Usage patterns and preferences</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              3. How We Use Your Information
            </h2>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-2 mb-4 ml-4">
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and manage subscriptions</li>
              <li>Send you technical notices and support messages</li>
              <li>Respond to your comments and questions</li>
              <li>Monitor and analyze usage patterns</li>
              <li>Detect, prevent, and address technical issues</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              4. Data Sharing and Disclosure
            </h2>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
              We do not sell your personal information. We may share your information only in the following circumstances:
            </p>
            <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-2 mb-4 ml-4">
              <li><strong>Service Providers:</strong> With third-party vendors who perform services on our behalf</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              <li><strong>With Your Consent:</strong> When you explicitly authorize us to share information</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              5. Data Security
            </h2>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
              We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              6. Your Rights
            </h2>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
              You have the right to:
            </p>
            <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-2 mb-4 ml-4">
              <li>Access and receive a copy of your personal data</li>
              <li>Rectify inaccurate or incomplete information</li>
              <li>Request deletion of your personal data</li>
              <li>Object to processing of your personal data</li>
              <li>Request restriction of processing</li>
              <li>Data portability</li>
            </ul>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              To exercise these rights, please contact us at privacy@loadmaster.com
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              7. Cookies and Tracking Technologies
            </h2>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
              We use cookies and similar tracking technologies to track activity on our service and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              8. Children's Privacy
            </h2>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              Our service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              9. Changes to This Privacy Policy
            </h2>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              10. Contact Us
            </h2>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <p className="text-slate-700 dark:text-slate-300">
                <strong>Email:</strong> privacy@loadmaster.com<br />
                <strong>Address:</strong> [Your Company Address]
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

