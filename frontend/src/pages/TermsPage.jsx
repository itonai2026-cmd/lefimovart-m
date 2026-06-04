import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";

const sections = [
  {
    title: "Description of the Service",
    blocks: [
      { p: "LefiMovArt provides artificial intelligence (\"AI\") tools that allow users to generate, edit, and transform images and video content based on text prompts, uploaded media, and other user inputs." },
      { p: "The App is intended for lawful personal and commercial use, subject to these Terms and applicable laws." },
    ],
  },
  {
    title: "License and Use of the Application",
    blocks: [
      { p: "ITonAI grants users a limited, non-exclusive, non-transferable, revocable license to use the App solely in accordance with these Terms." },
      { p: "You may not:" },
      {
        ul: [
          "Copy, reproduce, distribute, or resell the App or any part of it.",
          "Modify, reverse engineer, decompile, disassemble, or attempt to extract source code.",
          "Create derivative works based on the App.",
          "Circumvent security measures or usage limitations.",
          "Use automated systems or bots to access the service without authorization.",
        ],
      },
      { p: "All intellectual property rights relating to the App remain the exclusive property of ITonAI and its licensors." },
    ],
  },
  {
    title: "User Accounts",
    blocks: [
      { p: "Certain features may require account registration." },
      { p: "You are responsible for:" },
      {
        ul: [
          "Maintaining the confidentiality of your account credentials.",
          "All activities performed through your account.",
          "Providing accurate information during registration.",
          "Promptly notifying us of any unauthorized use of your account.",
        ],
      },
      { p: "We reserve the right to suspend or terminate accounts that violate these Terms." },
    ],
  },
  {
    title: "AI-Generated Content",
    blocks: [
      { p: "LefiMovArt uses artificial intelligence systems to generate and edit images and video content." },
      { p: "Users acknowledge that:" },
      {
        ul: [
          "AI-generated content may contain inaccuracies, artifacts, unexpected results, or similarities to existing content.",
          "Generated content is produced automatically and may not always meet expectations.",
          "ITonAI does not guarantee the accuracy, quality, legality, uniqueness, or suitability of generated content.",
        ],
      },
      { p: "Users remain solely responsible for reviewing and using generated content." },
    ],
  },
  {
    title: "User Content",
    blocks: [
      { p: "Users may upload images, videos, text prompts, and other materials (\"User Content\")." },
      { p: "By uploading User Content, you confirm that:" },
      {
        ul: [
          "You own the content or have all necessary rights and permissions to use it.",
          "The content does not infringe copyrights, trademarks, privacy rights, publicity rights, or other legal rights.",
          "The content complies with applicable laws and these Terms.",
        ],
      },
      { p: "You retain ownership of your User Content." },
      { p: "You grant ITonAI a limited license to process, store, transmit, and display such content solely for operating and improving the service." },
    ],
  },
  {
    title: "Ownership of Generated Content",
    blocks: [
      { p: "Subject to applicable laws and third-party AI provider requirements:" },
      {
        ul: [
          "Users retain rights to the images and videos they generate using LefiMovArt.",
          "Users are solely responsible for how generated content is used, distributed, published, or monetized.",
          "ITonAI does not claim ownership of user-generated outputs.",
        ],
      },
      { p: "Users must independently verify whether generated content can be legally used for commercial purposes in their jurisdiction." },
    ],
  },
  {
    title: "Prohibited Content and Conduct",
    blocks: [
      { p: "You may not use LefiMovArt to create, upload, distribute, or promote content that:" },
      {
        ul: [
          "Is sexually explicit or pornographic.",
          "Exploits or harms minors.",
          "Promotes violence, terrorism, self-harm, or criminal activities.",
          "Encourages hatred, discrimination, harassment, or abuse.",
          "Contains misleading, fraudulent, defamatory, or deceptive material.",
          "Violates intellectual property rights.",
          "Violates privacy or publicity rights.",
          "Violates applicable laws or regulations.",
        ],
      },
      { p: "We reserve the right to block requests, remove content, suspend accounts, or permanently terminate access for violations." },
    ],
  },
  {
    title: "Credits and Purchases",
    blocks: [
      { p: "Certain features require credits (in-app purchases)." },
      { p: "Image and video generation consumes credits according to the pricing and credit system displayed within the App." },
      { p: "Credits:" },
      {
        ul: [
          "Have no cash value.",
          "Are non-transferable.",
          "Cannot be exchanged for money.",
          "May expire if stated within the App.",
          "May be adjusted in cases of fraud, abuse, technical errors, or violations of these Terms.",
        ],
      },
      { p: "Purchases are processed through Google Play Billing and/or Apple In-App Purchases, or Stripe (for WEB)." },
      { p: "ITonAI does not store payment card information." },
      { p: "Refunds are governed by the applicable policies of Google Play, Apple App Store, Stripe and applicable consumer protection laws." },
    ],
  },
  {
    title: "Connectivity and Third-Party Services",
    blocks: [
      { p: "Certain features require an active internet connection." },
      { p: "We are not responsible for:" },
      {
        ul: [
          "Connectivity issues.",
          "Mobile network failures.",
          "Roaming charges.",
          "Third-party service outages.",
        ],
      },
      { p: "The App may use third-party services including:" },
      {
        ul: [
          "AI service providers.",
          "Cloud hosting providers.",
          "Analytics services.",
          "Advertising services.",
          "Payment processors.",
        ],
      },
      { p: "Use of such services may be subject to separate terms and privacy policies." },
    ],
  },
  {
    title: "Updates and Service Changes",
    blocks: [
      { p: "We may:" },
      {
        ul: [
          "Modify features.",
          "Add or remove functionality.",
          "Adjust credit allocations.",
          "Change credits plans.",
          "Introduce usage limitations.",
          "Update AI models.",
        ],
      },
      { p: "We may release updates that are required for continued functionality of the App." },
      { p: "Failure to install required updates may result in reduced functionality or inability to access the service." },
    ],
  },
  {
    title: "Availability of Service",
    blocks: [
      { p: "We strive to maintain reliable service but do not guarantee:" },
      {
        ul: [
          "Continuous availability.",
          "Error-free operation.",
          "Compatibility with all devices.",
          "Availability of specific AI models or generation capabilities.",
        ],
      },
      { p: "Service interruptions may occur for maintenance, upgrades, security reasons, or circumstances beyond our control." },
    ],
  },
  {
    title: "Limitation of Liability",
    blocks: [
      { p: "To the maximum extent permitted by law:" },
      { p: "ITonAI shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from:" },
      {
        ul: [
          "Use of the App.",
          "Generated content.",
          "Loss of data.",
          "Loss of profits.",
          "Service interruptions.",
          "Third-party actions or services.",
        ],
      },
      { p: "Users assume all risks associated with the use of AI-generated content." },
    ],
  },
  {
    title: "Indemnification",
    blocks: [
      { p: "You agree to defend, indemnify, and hold harmless ITonAI, its affiliates, employees, contractors, and partners from any claims, liabilities, damages, losses, or expenses arising from:" },
      {
        ul: [
          "Your use of the App.",
          "Your User Content.",
          "Generated content you distribute or publish.",
          "Violation of these Terms.",
          "Violation of any law or third-party rights.",
        ],
      },
    ],
  },
  {
    title: "Suspension and Termination",
    blocks: [
      { p: "We may suspend, restrict, or terminate access to the App at any time if:" },
      {
        ul: [
          "These Terms are violated.",
          "Fraudulent or abusive activity is detected.",
          "Required by law.",
          "Necessary to protect the security or integrity of the service.",
        ],
      },
      { p: "Upon termination:" },
      {
        ul: [
          "Your right to use the App immediately ends.",
          "Access to stored content may be removed.",
          "Remaining credits may be forfeited on termination by accepting the current terms.",
        ],
      },
    ],
  },
  {
    title: "Privacy",
    blocks: [
      { p: "Your use of LefiMovArt is also governed by our Privacy Policy." },
      { p: "By using the App, you acknowledge that certain information may be collected, processed, and stored as described in the Privacy Policy." },
    ],
  },
  {
    title: "Changes to These Terms",
    blocks: [
      { p: "We may update these Terms periodically." },
      { p: "Updated versions will become effective upon publication within the App or on the official website." },
      { p: "Continued use of the App after changes become effective constitutes acceptance of the revised Terms." },
    ],
  },
  {
    title: "Applicable Law",
    blocks: [
      { p: "These Terms shall be governed by and interpreted in accordance with the laws applicable within the European Union and, where required by law, the consumer protection laws of the user's country of residence." },
    ],
  },
  {
    title: "Contact",
    blocks: [
      { p: "For questions regarding these Terms and Conditions, please contact:" },
      { strong: "ITonAI" },
      { email: "office@itonai.ro" },
    ],
  },
];

function Block({ block }) {
  if (block.p) {
    return <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{block.p}</p>;
  }
  if (block.strong) {
    return <p className="text-sm font-semibold text-slate-900 dark:text-white">{block.strong}</p>;
  }
  if (block.ul) {
    return (
      <ul className="list-disc pl-5 space-y-1.5 marker:text-violet-500">
        {block.ul.map((item, i) => (
          <li key={i} className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{item}</li>
        ))}
      </ul>
    );
  }
  if (block.email) {
    return (
      <a href={`mailto:${block.email}`} className="inline-block text-sm font-medium text-violet-600 dark:text-violet-400 hover:underline">
        Email: {block.email}
      </a>
    );
  }
  return null;
}

export default function TermsPage() {
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
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Terms and Conditions of Use</h1>
            <p className="mt-1 text-sm font-medium text-violet-600 dark:text-violet-400">LefiMovArt</p>
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              By downloading, installing, accessing, or using the LefiMovArt application ("App"), you agree to be bound by these Terms and Conditions. If you do not agree with these Terms, please do not use the App.
            </p>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              LefiMovArt is owned and operated by ITonAI.
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
                  {section.blocks.map((block, i) => (
                    <Block key={i} block={block} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
