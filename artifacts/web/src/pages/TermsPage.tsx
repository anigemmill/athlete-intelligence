import React from "react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Link } from "wouter";
import { Helmet } from "react-helmet-async";

const LAST_UPDATED = "19 July 2026";
const COMPANY = "The Outside In Limited";
const COMPANY_SHORT = "Athlete Intelligence";
const CONTACT_EMAIL = "legal@athleteintelligence.ai";
const CONTACT_LINK = "/contact";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-[20px] font-bold text-[#1C1F3A] mb-4 pb-3 border-b border-[#DCE2EF]">{title}</h2>
      <div className="space-y-4 text-[15px] text-[#4A5068] leading-relaxed">{children}</div>
    </section>
  );
}

function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[15px] font-semibold text-[#1C1F3A] mb-2">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

const TOC = [
  { id: "acceptance", label: "Acceptance of Terms" },
  { id: "service", label: "The Service" },
  { id: "accounts", label: "Accounts & Registration" },
  { id: "billing", label: "Subscriptions, Trials & Billing" },
  { id: "use", label: "Acceptable Use" },
  { id: "data", label: "Data & Privacy" },
  { id: "ip", label: "Intellectual Property" },
  { id: "disclaimers", label: "Disclaimers" },
  { id: "liability", label: "Limitation of Liability" },
  { id: "indemnity", label: "Indemnification" },
  { id: "termination", label: "Termination" },
  { id: "governing", label: "Governing Law" },
  { id: "changes", label: "Changes to These Terms" },
  { id: "contact", label: "Contact" },
];

export default function TermsPage() {
  return (
    <>
      <Helmet>
        <title>Terms of Service — Athlete Intelligence</title>
        <meta name="description" content="Terms of Service for Athlete Intelligence — the AI-powered athlete monitoring platform by The Outside In Limited." />
        <meta property="og:title" content="Terms of Service — Athlete Intelligence" />
        <meta property="og:description" content="Terms of Service for the Athlete Intelligence platform." />
      </Helmet>
      <PublicLayout>
      <div className="max-w-5xl mx-auto px-6 py-16 lg:py-24">

        {/* Header */}
        <div className="mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-semibold text-[#344F9F] bg-[#344F9F]/10 border border-[#344F9F]/20 mb-6">
            Legal
          </div>
          <h1 className="text-[38px] lg:text-[48px] font-bold text-[#1C1F3A] tracking-tight leading-tight mb-4">
            Terms of Service
          </h1>
          <p className="text-[16px] text-[#6B7080]">
            Last updated: <span className="font-medium text-[#1C1F3A]">{LAST_UPDATED}</span>
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-12">

          {/* Sidebar TOC */}
          <aside className="lg:w-56 flex-shrink-0">
            <div className="lg:sticky lg:top-24">
              <p className="text-[11px] font-semibold text-[#9097B0] uppercase tracking-widest mb-3">Contents</p>
              <nav className="space-y-1">
                {TOC.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="block text-[13px] text-[#6B7080] hover:text-[#E75D50] transition-colors py-0.5"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Body */}
          <div className="flex-1 space-y-12">

            {/* Intro */}
            <div className="bg-[#F5F7FC] border border-[#DCE2EF] rounded-xl px-6 py-5 text-[14px] text-[#4A5068] leading-relaxed">
              These Terms of Service ("Terms") govern your access to and use of the {COMPANY_SHORT} platform (the "Service") operated by {COMPANY} ("we", "us", or "our"), a company registered in New Zealand. By creating an account or using the Service you agree to be bound by these Terms. If you are using the Service on behalf of an organisation, you represent that you have authority to bind that organisation to these Terms.
            </div>

            <Section id="acceptance" title="1. Acceptance of Terms">
              <p>
                By clicking "Start free trial", completing account registration, or otherwise accessing the Service, you confirm that you have read, understood, and agree to these Terms and our Privacy Policy. If you do not agree, you must not use the Service.
              </p>
              <p>
                These Terms form a legally binding agreement between you (or the organisation you represent) and {COMPANY}. "You" and "Customer" refer to the individual or entity entering into this agreement.
              </p>
            </Section>

            <Section id="service" title="2. The Service">
              <Sub title="2.1 Description">
                <p>
                  {COMPANY_SHORT} is a B2B SaaS intelligence platform that collects, processes, and presents publicly available information about athletes across all sports and jurisdictions. The Service includes athlete dossiers, intelligence feeds, alerts, AI-generated summaries, and related analytics tools.
                </p>
              </Sub>
              <Sub title="2.2 Data Sources">
                <p>
                  All athlete intelligence is sourced from publicly available information including official sports federation records, verified media, competition databases, and publicly accessible social media. We do not purchase, access, or process private athlete data.
                </p>
              </Sub>
              <Sub title="2.3 AI-Generated Content">
                <p>
                  The Service uses artificial intelligence to generate summaries, confidence scores, and analytical outputs. AI-generated content is provided for informational purposes only and may contain errors or omissions. You are responsible for independently verifying any information before relying on it for athlete selection, contracting, or other material decisions.
                </p>
              </Sub>
              <Sub title="2.4 Service Availability">
                <p>
                  We aim to provide a reliable service but do not guarantee uninterrupted availability. We may perform scheduled or emergency maintenance that temporarily limits access. We will endeavour to provide advance notice of significant planned downtime.
                </p>
              </Sub>
            </Section>

            <Section id="accounts" title="3. Accounts & Registration">
              <Sub title="3.1 Eligibility">
                <p>
                  The Service is intended for use by sports organisations, professional clubs, national federations, academies, and agencies. You must be at least 18 years old and have the legal capacity to enter into binding contracts in your jurisdiction.
                </p>
              </Sub>
              <Sub title="3.2 Account Security">
                <p>
                  You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must notify us immediately at{" "}
                  <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#E75D50] hover:underline">{CONTACT_EMAIL}</a>{" "}
                  if you become aware of any unauthorised access.
                </p>
              </Sub>
              <Sub title="3.3 Accurate Information">
                <p>
                  You agree to provide accurate, current, and complete information during registration and to keep that information up to date. We may suspend or terminate accounts that contain materially false information.
                </p>
              </Sub>
              <Sub title="3.4 Team Seats">
                <p>
                  Your subscription plan includes a fixed number of team seats. Each seat may be assigned to one individual user. Sharing credentials between multiple individuals is not permitted.
                </p>
              </Sub>
            </Section>

            <Section id="billing" title="4. Subscriptions, Trials & Billing">
              <Sub title="4.1 Free Trial">
                <p>
                  We offer a 3-day free trial for new subscribers on Starter and Pro plans. No charge is made until the trial period ends. If you do not cancel before the trial ends, your payment method will be charged at the applicable subscription rate. You may cancel at any time via the billing portal in your account settings or by contacting us.
                </p>
              </Sub>
              <Sub title="4.2 Subscription Plans & Pricing">
                <p>
                  Subscriptions are available on monthly or annual billing cycles. Current pricing is listed on our{" "}
                  <Link href="/pricing">
                    <span className="text-[#E75D50] hover:underline cursor-pointer">Pricing page</span>
                  </Link>
                  . Prices are displayed in USD and exclusive of any applicable taxes or duties.
                </p>
              </Sub>
              <Sub title="4.3 Automatic Renewal">
                <p>
                  Subscriptions renew automatically at the end of each billing period unless cancelled. You authorise us to charge your payment method on file for each renewal period.
                </p>
              </Sub>
              <Sub title="4.4 Taxes">
                <p>
                  You are responsible for all applicable taxes, levies, or duties imposed by taxing authorities in your jurisdiction. Where required by law, we may collect and remit applicable taxes on your behalf.
                </p>
              </Sub>
              <Sub title="4.5 Refunds">
                <p>
                  Subscription fees are non-refundable except where required by applicable law or at our sole discretion. We do not provide partial refunds for unused portions of a billing period. If you cancel, you retain access until the end of your paid period.
                </p>
              </Sub>
              <Sub title="4.6 Plan Changes">
                <p>
                  You may upgrade your plan at any time; the change takes effect immediately and any additional charge is pro-rated. Downgrades take effect at the start of the next billing period. Changes can be made via the billing portal in your account settings.
                </p>
              </Sub>
              <Sub title="4.7 Failed Payments">
                <p>
                  If a payment fails, we will notify you and may suspend access to the Service until payment is successfully processed. Accounts with overdue balances may be terminated after 30 days.
                </p>
              </Sub>
            </Section>

            <Section id="use" title="5. Acceptable Use">
              <p>You agree to use the Service only for lawful purposes and in accordance with these Terms. You must not:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Use the Service to harass, stalk, or cause harm to any athlete or individual;</li>
                <li>Resell, sublicense, or commercially redistribute Service outputs without our prior written consent;</li>
                <li>Attempt to reverse-engineer, scrape, or extract data from the Service at scale using automated means;</li>
                <li>Upload or transmit malicious code or interfere with the Service's infrastructure;</li>
                <li>Use the Service to build a competing product or service;</li>
                <li>Circumvent access controls, athlete limits, or other technical restrictions;</li>
                <li>Violate any applicable local, national, or international law or regulation;</li>
                <li>Use AI-generated outputs as the sole basis for high-stakes decisions (e.g. contract signings, disciplinary action) without independent verification.</li>
              </ul>
            </Section>

            <Section id="data" title="6. Data & Privacy">
              <Sub title="6.1 Personal Data You Provide">
                <p>
                  We collect and process personal data you provide during registration and account use (name, email, organisation, billing information). This is handled in accordance with our Privacy Policy and applicable law including the New Zealand Privacy Act 2020, the EU General Data Protection Regulation (GDPR), and the UK GDPR.
                </p>
              </Sub>
              <Sub title="6.2 Athlete Data">
                <p>
                  All athlete information presented in the Service is sourced from publicly available records. We do not process sensitive personal data, medical records, or private communications about athletes. Confidence scores reflect the reliability of public sources, not private assessments.
                </p>
              </Sub>
              <Sub title="6.3 Data Processing">
                <p>
                  By using the Service, you acknowledge that we process public information about third-party individuals (athletes). You agree to use this information responsibly, in compliance with applicable data protection laws in your jurisdiction, and consistent with the legitimate purposes of athlete performance intelligence.
                </p>
              </Sub>
              <Sub title="6.4 Data Security">
                <p>
                  We implement industry-standard security measures including TLS 1.3 encryption in transit and AES-256 encryption at rest. Our full security posture is documented on our{" "}
                  <Link href="/security">
                    <span className="text-[#E75D50] hover:underline cursor-pointer">Security & Trust page</span>
                  </Link>.
                </p>
              </Sub>
            </Section>

            <Section id="ip" title="7. Intellectual Property">
              <Sub title="7.1 Our Property">
                <p>
                  The Service, including its software, design, algorithms, AI models, and compiled intelligence outputs, is the intellectual property of {COMPANY} or its licensors. Nothing in these Terms transfers ownership of any of our intellectual property to you.
                </p>
              </Sub>
              <Sub title="7.2 Licence to Use">
                <p>
                  We grant you a limited, non-exclusive, non-transferable licence to access and use the Service during your subscription period solely for your internal business purposes. This licence terminates when your subscription ends or is cancelled.
                </p>
              </Sub>
              <Sub title="7.3 Your Content">
                <p>
                  You retain ownership of any data or content you upload to the Service (e.g. internal notes, custom watchlists). You grant us a limited licence to process that content solely to provide the Service to you.
                </p>
              </Sub>
              <Sub title="7.4 Feedback">
                <p>
                  If you provide suggestions, feedback, or feature requests, you grant us a perpetual, royalty-free licence to use that feedback to improve the Service without obligation to you.
                </p>
              </Sub>
            </Section>

            <Section id="disclaimers" title="8. Disclaimers">
              <p>
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
              </p>
              <p>
                We do not warrant that: (a) the Service will be uninterrupted or error-free; (b) any intelligence output is accurate, complete, or current; (c) the Service will meet your specific requirements. You assume all risk associated with your use of and reliance on Service outputs.
              </p>
              <p>
                To the extent permitted by applicable law, we expressly disclaim all liability for decisions made by you or your organisation based on intelligence outputs generated by the Service.
              </p>
            </Section>

            <Section id="liability" title="9. Limitation of Liability">
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL {COMPANY.toUpperCase()}, ITS DIRECTORS, EMPLOYEES, OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF OR INABILITY TO USE THE SERVICE.
              </p>
              <p>
                OUR TOTAL AGGREGATE LIABILITY TO YOU FOR ANY CLAIM ARISING UNDER THESE TERMS SHALL NOT EXCEED THE GREATER OF: (A) THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM; OR (B) NZD $100.
              </p>
              <p>
                Some jurisdictions do not allow the exclusion or limitation of certain warranties or liabilities. To the extent such limitations are prohibited, our liability is limited to the minimum extent permitted by applicable law.
              </p>
            </Section>

            <Section id="indemnity" title="10. Indemnification">
              <p>
                You agree to indemnify, defend, and hold harmless {COMPANY} and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable legal fees) arising out of or in any way connected with: (a) your use of the Service; (b) your violation of these Terms; (c) your violation of any applicable law; or (d) any claim that your use of Service outputs harmed a third party.
              </p>
            </Section>

            <Section id="termination" title="11. Termination">
              <Sub title="11.1 Termination by You">
                <p>
                  You may cancel your subscription at any time via the billing portal in your account settings. Cancellation takes effect at the end of your current billing period unless you are within a free trial, in which case access ends immediately upon cancellation.
                </p>
              </Sub>
              <Sub title="11.2 Termination by Us">
                <p>
                  We may suspend or terminate your account immediately, without notice, if you: materially breach these Terms; engage in fraudulent activity; fail to pay amounts owing; or if we are required to do so by law.
                </p>
              </Sub>
              <Sub title="11.3 Effect of Termination">
                <p>
                  Upon termination, your right to access the Service ceases immediately. Sections 6, 7, 8, 9, 10, and 12 survive termination.
                </p>
              </Sub>
            </Section>

            <Section id="governing" title="12. Governing Law">
              <p>
                These Terms are governed by and construed in accordance with the laws of New Zealand, without regard to its conflict of law provisions. You agree to submit to the exclusive jurisdiction of the courts of New Zealand for any dispute arising out of or relating to these Terms or the Service.
              </p>
              <p>
                If you are located in the European Union, you may also have rights under local consumer protection or data protection laws that cannot be waived by contract.
              </p>
            </Section>

            <Section id="changes" title="13. Changes to These Terms">
              <p>
                We may update these Terms from time to time. When we make material changes, we will notify you by email or by a prominent notice within the Service at least 14 days before the changes take effect. Your continued use of the Service after the effective date constitutes your acceptance of the revised Terms.
              </p>
              <p>
                If you do not agree to the revised Terms, you must cancel your subscription before the effective date.
              </p>
            </Section>

            <Section id="contact" title="14. Contact">
              <p>
                Questions about these Terms should be directed to:
              </p>
              <div className="bg-[#F5F7FC] border border-[#DCE2EF] rounded-xl px-6 py-5 mt-2 not-prose">
                <p className="font-semibold text-[#1C1F3A]">{COMPANY}</p>
                <p className="text-[#6B7080] mt-1">trading as {COMPANY_SHORT}</p>
                <p className="mt-2">
                  <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#E75D50] hover:underline font-medium">
                    {CONTACT_EMAIL}
                  </a>
                </p>
                <p className="mt-1">
                  <Link href={CONTACT_LINK}>
                    <span className="text-[#344F9F] hover:underline cursor-pointer">Contact form →</span>
                  </Link>
                </p>
              </div>
            </Section>

          </div>
        </div>
      </div>
    </PublicLayout>
    </>
  );
}
