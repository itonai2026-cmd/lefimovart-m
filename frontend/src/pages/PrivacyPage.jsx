import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background dark:bg-slate-950">
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-violet-600 dark:text-violet-400 font-medium mb-6 min-h-[44px]">
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800 p-6 space-y-5">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Privacy Policy - LEFI</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            LEFI collects only the information needed to operate the service: account email, generated content metadata, technical logs, credits, and payment confirmation details from Stripe.
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            We use this data to authenticate users, provide AI generation features, process credits, diagnose issues, prevent abuse, and improve the application. We do not sell personal information.
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Payments are processed by Stripe. LEFI does not store card details. Users can request account deletion from Settings, which removes the local account and generated records from the connected database.
          </p>
          <p className="text-sm text-violet-600 dark:text-violet-400 font-medium">Email: office@itonai.ro</p>
        </motion.div>
      </div>
    </div>
  );
}
