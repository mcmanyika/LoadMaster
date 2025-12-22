import React from 'react';
import { ArrowLeft, FileText } from 'lucide-react';

interface TermsOfServiceProps {
  onBack?: () => void;
}

export const TermsOfService: React.FC<TermsOfServiceProps> = ({ onBack }) => {
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
            <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">
              Terms of Service
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
              1. Acceptance of Terms
            </h2>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
              By accessing and using LoadMaster ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              2. Description of Service
            </h2>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
              LoadMaster is a fleet management platform that provides tools for managing loads, drivers, dispatchers, vehicles, and related business operations. The Service includes features such as:
            </p>
            <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-2 mb-4 ml-4">
              <li>Load tracking and management</li>
              <li>Driver and dispatcher management</li>
              <li>Financial reporting and analytics</li>
              <li>Document storage and management</li>
              <li>Expense tracking</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              3. User Accounts
            </h2>
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-3 mt-6">
              3.1 Account Creation
            </h3>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
              To use certain features of the Service, you must register for an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete.
            </p>

            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-3 mt-6">
              3.2 Account Security
            </h3>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
              You are responsible for safeguarding your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              4. Subscription and Payment
            </h2>
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-3 mt-6">
              4.1 Subscription Plans
            </h3>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
              The Service is offered on a subscription basis. You may choose from different subscription plans, each with its own features and pricing. Subscription fees are billed in advance on a monthly or annual basis.
            </p>

            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-3 mt-6">
              4.2 Free Trial
            </h3>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
              We offer a 14-day free trial period. You may cancel your subscription at any time during the trial period without being charged.
            </p>

            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-3 mt-6">
              4.3 Payment Terms
            </h3>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
              All fees are non-refundable except as required by law. You authorize us to charge your payment method for all fees due. If payment is not received, we may suspend or terminate your access to the Service.
            </p>

            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-3 mt-6">
              4.4 Cancellation
            </h3>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              You may cancel your subscription at any time. Cancellation will take effect at the end of your current billing period. You will continue to have access to the Service until the end of your billing period.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              5. User Content and Data
            </h2>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
              You retain ownership of all data and content you upload to the Service. By using the Service, you grant us a license to use, store, and process your data solely for the purpose of providing the Service to you.
            </p>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              You are responsible for ensuring that your content does not violate any laws or infringe on the rights of others. We reserve the right to remove any content that violates these Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              6. Acceptable Use
            </h2>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
              You agree not to:
            </p>
            <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-2 mb-4 ml-4">
              <li>Use the Service for any illegal purpose or in violation of any laws</li>
              <li>Violate or infringe upon the rights of others</li>
              <li>Transmit any harmful code, viruses, or malicious software</li>
              <li>Attempt to gain unauthorized access to the Service or related systems</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Use automated systems to access the Service without permission</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              7. Intellectual Property
            </h2>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
              The Service and its original content, features, and functionality are owned by LoadMaster and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
            </p>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              You may not copy, modify, distribute, sell, or lease any part of the Service without our prior written consent.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              8. Disclaimer of Warranties
            </h2>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
            </p>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              We do not warrant that the Service will be uninterrupted, secure, or error-free, or that defects will be corrected.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              9. Limitation of Liability
            </h2>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, LOADMASTER SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              10. Termination
            </h2>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
              We may terminate or suspend your account and access to the Service immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.
            </p>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              Upon termination, your right to use the Service will immediately cease. We may delete your account and data at any time after termination.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              11. Changes to Terms
            </h2>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify you of any material changes by posting the new Terms on this page and updating the "Last updated" date. Your continued use of the Service after such changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              12. Governing Law
            </h2>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction], without regard to its conflict of law provisions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              13. Contact Information
            </h2>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <p className="text-slate-700 dark:text-slate-300">
                <strong>Email:</strong> legal@loadmaster.com<br />
                <strong>Address:</strong> [Your Company Address]
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

