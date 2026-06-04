import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";

const sections = [
  {
    title: "General Information",
    paragraphs: [
      "LefiMovArt is an application that allows users to generate and edit images and video clips using artificial intelligence based on prompts, uploaded media, and creative inputs.",
      "We respect user privacy and process personal data only as necessary to provide, maintain, secure, and improve the application.",
    ],
  },
  {
    title: "Information We Collect",
    intro: "Depending on how you use the app, LefiMovArt may collect:",
    bullets: [
      "Account information, such as email address, user ID, and authentication details.",
      "Technical device information, such as device model, operating system, app version, device identifiers, IP address, and language settings.",
      "Usage information, such as features used, generation history, session duration, interactions, and app activity.",
      "User-generated content, including prompts, uploaded images, uploaded videos, generated images, generated videos, and editing requests.",
      "Diagnostic information, such as crash logs, error reports, and performance data.",
      "Purchase information, such as credit status, purchase history, and transaction identifiers processed through Google Play Billing and/or Apple In-App Purchases.",
    ],
    outro: [
      "LefiMovArt does not intentionally collect more information than necessary for the operation and improvement of the service.",
    ],
  },
  {
    title: "How We Use Information",
    intro: "We use collected information to:",
    bullets: [
      "Provide AI image and video generation features.",
      "Process prompts, uploaded images, uploaded videos, and editing requests.",
      "Manage accounts, authentication, credits, and premium features.",
      "Improve app performance, reliability, and user experience.",
      "Detect, prevent, and investigate fraud, abuse, security incidents, or policy violations.",
      "Diagnose and fix technical issues.",
      "Provide customer support.",
      "Comply with legal obligations.",
    ],
    outro: ["We do not sell personal information to third parties."],
  },
  {
    title: "AI Processing and User Content",
    paragraphs: [
      "To provide AI generation and editing features, user prompts, uploaded content, and generated media may be processed by LefiMovArt systems and trusted third-party AI service providers.",
    ],
    intro: "Uploaded and generated content may be temporarily stored in order to:",
    bullets: [
      "Deliver the requested results.",
      "Allow users to access generated content.",
      "Improve service reliability and performance.",
      "Prevent abuse, misuse, or violations of applicable rules.",
      "Comply with legal and security obligations.",
    ],
    outro: [
      "Users are responsible for ensuring that they have the necessary rights, permissions, and consent for any images, videos, prompts, or other content uploaded to the application.",
    ],
  },
  {
    title: "AI-Generated Content Safety",
    paragraphs: [
      "LefiMovArt may use automated and manual systems to detect, block, or remove content that violates applicable laws, platform rules, or our internal safety standards.",
      "The app may restrict or refuse requests involving harmful, illegal, abusive, sexually explicit, deceptive, or otherwise prohibited content.",
      "Users may contact us to report problematic AI-generated content or suspected misuse.",
    ],
  },
  {
    title: "Data Sharing",
    intro: "We may share limited information with trusted third-party service providers strictly as necessary to operate and improve the app, including:",
    ordered: [
      "Analytics providers, such as Google Firebase.",
      "Advertising providers, such as Google AdMob, where applicable.",
      "Cloud hosting and infrastructure providers.",
      "AI processing and content generation providers.",
      "Crash reporting and monitoring services.",
      "Customer support services.",
      "Payment processing platforms, such as Google Play Billing and Apple In-App Purchases, or Stripe for the WEB version.",
    ],
    outro: [
      "These providers may process data according to their own privacy policies and applicable data protection laws.",
    ],
  },
  {
    title: "Payments",
    paragraphs: [
      "All purchases are processed securely through Google Play Billing and/or Apple In-App Purchases, or Stripe (for WEB).",
      "LefiMovArt does not collect, process, or store payment card details. Payment-related information is handled by the used payment provider.",
    ],
  },
  {
    title: "Permissions and Notifications",
    intro: "The app may request device permissions required for its features, including:",
    bullets: [
      "Access to photos and videos.",
      "Camera access.",
      "Storage or media library access.",
      "Notifications.",
    ],
    outro: [
      "Permissions can be managed, granted, or withdrawn at any time through device settings.",
      "LefiMovArt may send push notifications related to account activity, generated content, service updates, or promotional information. Notifications can be disabled from device settings.",
    ],
  },
  {
    title: "Data Retention",
    paragraphs: [
      "We retain personal data and user-generated content only for as long as necessary to provide the service, maintain security, comply with legal obligations, resolve disputes, and enforce our terms.",
      "Generated content, uploaded files, logs, and technical data may be deleted or anonymized after they are no longer needed.",
      "Users may request deletion of their account and associated personal data, subject to legal, security, and technical limitations.",
    ],
  },
  {
    title: "User Rights",
    intro: "Depending on your location and applicable privacy laws, including the General Data Protection Regulation (GDPR), you may have the right to:",
    bullets: [
      "Request access to your personal data.",
      "Request correction of inaccurate or incomplete data.",
      "Request deletion of your personal data.",
      "Restrict or object to certain processing activities.",
      "Request data portability, where applicable.",
      "Withdraw consent where processing is based on consent.",
      "Lodge a complaint with a competent data protection authority.",
    ],
    outro: [
      "To exercise these rights, please contact us using the contact details below.",
    ],
  },
  {
    title: "Log Data",
    intro: "When using the application, we may automatically collect technical information such as:",
    bullets: [
      "IP address.",
      "Device type.",
      "Operating system.",
      "App version.",
      "Date and time of access.",
      "Error reports.",
      "Crash logs.",
      "Diagnostic and performance information.",
    ],
    outro: [
      "This information is used to maintain security, improve performance, and resolve technical issues.",
    ],
  },
  {
    title: "Cookies and Similar Technologies",
    paragraphs: [
      "The LefiMovArt app does not directly use browser cookies. However, third-party SDKs integrated into the app may use cookies, device identifiers, SDKs, or similar technologies for analytics, advertising, fraud prevention, security, and service optimization.",
    ],
  },
  {
    title: "International Data Transfers",
    paragraphs: [
      "Some service providers may process data outside your country of residence. When such transfers occur, we take reasonable measures to ensure that personal data receives an appropriate level of protection in accordance with applicable data protection laws.",
    ],
  },
  {
    title: "Data Security",
    paragraphs: [
      "We use reasonable technical and organizational measures to protect personal data against unauthorized access, loss, misuse, alteration, disclosure, or destruction.",
      "However, no method of electronic transmission or storage is completely secure, and we cannot guarantee absolute security.",
    ],
  },
  {
    title: "External Links",
    paragraphs: [
      "The app may contain links to third-party websites, services, or content. We are not responsible for the privacy practices, content, or policies of external services. Users should review the privacy policies of those services before using them.",
    ],
  },
  {
    title: "Children's Privacy",
    paragraphs: [
      "LefiMovArt is not intended for children under the minimum age required by applicable law in their jurisdiction.",
      "We do not knowingly collect personal information from children. If we become aware that personal data from a child has been collected without appropriate consent, we will take reasonable steps to delete it.",
    ],
  },
  {
    title: "Data Safety Disclosure",
    paragraphs: [
      "Information disclosed in this Privacy Policy should be consistent with the information provided in the Google Play Data Safety section.",
      "If the app's data collection, sharing, permissions, or third-party services change, this Privacy Policy and the Google Play Data Safety form should be updated accordingly.",
    ],
  },
  {
    title: "Changes to This Privacy Policy",
    paragraphs: [
      "We may update this Privacy Policy from time to time to reflect changes in the app, legal requirements, third-party services, or business practices.",
      "Continued use of LefiMovArt after an updated policy becomes effective represents acceptance of the updated Privacy Policy.",
    ],
  },
  {
    title: "Effective Date",
    paragraphs: [
      "This Privacy Policy is effective from the date it is published in the application, on the official website, or on the app store listing.",
    ],
  },
  {
    title: "Contact",
    paragraphs: [
      "For questions, requests, complaints, or suggestions regarding this Privacy Policy, please contact us at:",
    ],
    contactEmail: "office@itonai.ro",
  },
];

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background dark:bg-slate-950">
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-violet-600 dark:text-violet-400 font-medium mb-6 min-h-[44px]">
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800 p-6 sm:p-8">
          <header className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Privacy Policy</h1>
            <p className="mt-1 text-sm font-medium text-violet-600 dark:text-violet-400">LefiMovArt</p>
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              This Privacy Policy explains how the LefiMovArt app collects, uses, stores, shares, and protects user information. By using the app, you agree to the practices described below.
            </p>
          </header>

          <div className="space-y-8">
            {sections.map((section, index) => (
              <section key={section.title}>
                <h2 className="flex items-baseline gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                  <span className="text-violet-600 dark:text-violet-400">{index + 1}.</span>
                  <span>{section.title}</span>
                </h2>
                <div className="mt-3 space-y-3">
                  {section.paragraphs?.map((text, i) => (
                    <p key={i} className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {text}
                    </p>
                  ))}

                  {section.intro && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{section.intro}</p>
                  )}

                  {section.bullets && (
                    <ul className="list-disc pl-5 space-y-1.5 marker:text-violet-500">
                      {section.bullets.map((item, i) => (
                        <li key={i} className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}

                  {section.ordered && (
                    <ol className="list-decimal pl-5 space-y-1.5 marker:text-violet-500 marker:font-medium">
                      {section.ordered.map((item, i) => (
                        <li key={i} className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          {item}
                        </li>
                      ))}
                    </ol>
                  )}

                  {section.outro?.map((text, i) => (
                    <p key={i} className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {text}
                    </p>
                  ))}

                  {section.contactEmail && (
                    <a href={`mailto:${section.contactEmail}`} className="inline-block text-sm font-medium text-violet-600 dark:text-violet-400 hover:underline">
                      Email: {section.contactEmail}
                    </a>
                  )}
                </div>
              </section>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
