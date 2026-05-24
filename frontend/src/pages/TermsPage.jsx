import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background dark:bg-slate-950">
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-violet-600 dark:text-violet-400 font-medium mb-6 min-h-[44px]">
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800 p-6 space-y-5">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Terms of use - LEFI</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            LEFI lets users generate and edit AI images and videos. The application must be used only for lawful purposes and in a way that respects other people's rights.
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Generated content belongs to the user to the extent permitted by law, but users are responsible for how they create, publish, and use that content.
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Credits are consumed by generation actions. Extra credits may be purchased through Stripe where available. We may restrict accounts that abuse the service or violate these terms.
          </p>
          <p className="text-sm text-violet-600 dark:text-violet-400 font-medium">Email: office@itonai.ro</p>
        </motion.div>
      </div>
    </div>
  );
}
