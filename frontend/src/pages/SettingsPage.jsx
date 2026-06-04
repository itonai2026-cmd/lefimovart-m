import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Coins, FileText, ImageIcon, Loader2, LogOut, Settings2, ShieldCheck, Trash2, Wand2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import AppLogo from "../components/AppLogo";
import Layout from "../components/Layout";
import { useAuth } from "../lib/AuthContext";
import itonaiLogo from "../assets/itonai-logo.png";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const tabs = [
    { id: "generate", label: "Generate", icon: Wand2 },
    { id: "gallery", label: "Gallery", icon: ImageIcon },
    { id: "settings", label: "Settings", icon: Settings2 },
  ];

  const handleDeleteAccount = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await fetch("/wp/lefimovart/api/account/delete.php", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Account deletion failed");
      toast.success("Account deleted successfully.");
      logout();
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error(err.message || "Account deletion failed. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const Row = ({ icon: Icon, children, detail, danger, admin, onClick, disabled }) => (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border mb-4 overflow-hidden ${
        danger
          ? "border-red-100 dark:border-red-900/40"
          : admin
            ? "border-blue-100 dark:border-blue-900/40"
            : "border-slate-100 dark:border-slate-800"
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`w-full flex items-center gap-3 px-5 py-4 min-h-[56px] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors select-none disabled:opacity-60 ${
          danger ? "text-red-500" : admin ? "text-blue-600 dark:text-blue-400" : "text-slate-700 dark:text-slate-200"
        }`}
      >
        <Icon className={`w-5 h-5 ${danger || admin ? "" : "text-slate-400"}`} />
        <span className="font-medium">{children}</span>
        {detail && <span className="text-xs text-slate-400 ml-auto">{detail}</span>}
      </button>
    </motion.div>
  );

  return (
    <Layout
      tabs={tabs}
      activeTab="settings"
      onTabChange={(tabId) => {
        if (tabId === "generate") navigate("/ai-images");
        if (tabId === "gallery") navigate("/gallery");
        if (tabId === "settings") navigate("/settings");
      }}
    >
    <div className="min-h-full bg-background dark:bg-slate-950" role="region" aria-label="Settings page">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-100/40 dark:bg-violet-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-100/40 dark:bg-indigo-900/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white mb-6 px-4 py-4 rounded-2xl dark:bg-slate-900 shadow-lg shadow-violet-500/10 border border-slate-100 dark:border-slate-800 flex items-center gap-3"
        >
          <AppLogo className="w-14 h-14 rounded-xl shrink-0" />
          <div className="text-left leading-tight">
            <p className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">LefiMovArt</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">V1.1.0</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right leading-tight">
              <p className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">ITonAI</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">lefi.itonai.ro</p>
            </div>
            <img
              src={itonaiLogo}
              alt="ITonAI logo"
              className="w-14 h-14 rounded-xl object-contain bg-white p-1 shrink-0"
              loading="eager"
              decoding="async"
            />
          </div>
        </motion.div>

        <Row icon={Coins} detail="Bronze / Silver / Gold / Diamond / Rhodium" onClick={() => navigate("/buy-credits")}>
          Buy more credits
        </Row>

        <Row icon={LogOut} detail={user?.email} onClick={() => { logout(); navigate("/login", { replace: true }); }}>
          Log Out
        </Row>

        <Row icon={ShieldCheck} onClick={() => navigate("/privacy")}>
          Privacy Policy
        </Row>

        <Row icon={FileText} onClick={() => navigate("/terms")}>
          Terms of use
        </Row>

        <Row icon={Trash2} danger disabled={deleting} onClick={() => setDeleteDialogOpen(true)}>
          {deleting ? "Processing..." : "Delete Account"}
        </Row>

        {user?.role === "admin" && (
          <Row icon={Settings2} admin onClick={() => navigate("/admin")}>
            Admin Panel
          </Row>
        )}

        {deleteDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-xl border border-red-100 dark:border-red-900/40">
              <h2 className="text-lg font-bold text-red-600 mb-2">Delete Account?</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                This action is permanent and irreversible. All your data, including credits and generated images, will be lost.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteDialogOpen(false)}
                  className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[44px] font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setDeleteDialogOpen(false);
                    await handleDeleteAccount();
                  }}
                  className="flex-1 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white min-h-[44px] font-medium"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Yes, Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </Layout>
  );
}
