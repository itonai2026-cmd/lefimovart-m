import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Coins, Image, ImagePlus, Users, Plus, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "../lib/AuthContext";
import StickerManager from "../components/admin/StickerManager";
import UsersTable from "../components/admin/UsersTable";
import ImagesTable from "../components/admin/ImagesTable";

const MAX_CREDITS = 40;

const tabs = [
  { name: "credits", label: "Credits", icon: Coins },
  { name: "stickers", label: "Sticker Gallery", icon: ImagePlus },
  { name: "users", label: "Users", icon: Users },
  { name: "images", label: "Images", icon: Image },
];

export default function AdminPanel() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [grantTarget, setGrantTarget] = useState(null);
  const [grantAmount, setGrantAmount] = useState(40);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("credits");

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await fetch("/wp/lefimovart/api/admin/users.php", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Failed to load users");
        setAllUsers(data.users || []);
      } catch (err) {
        toast.error(err.message || "Failed to load users");
      } finally {
        setLoading(false);
      }
    };
    if (user?.role === "admin") loadUsers();
    else setLoading(false);
  }, [user?.role]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return allUsers.filter((u) => u.email?.toLowerCase().includes(q) || u.name?.toLowerCase().includes(q));
  }, [allUsers, searchQuery]);

  const updateCredits = async (targetUserId, credits) => {
    setSaving(true);
    try {
      const res = await fetch("/wp/lefimovart/api/admin/users.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ user_id: targetUserId, credits }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to update credits");
      setAllUsers((prev) => prev.map((u) => (u.id === data.user.id ? data.user : u)));
      if (grantTarget?.id === data.user.id) setGrantTarget(data.user);
      if (user?.id === data.user.id) setUser(data.user);
      toast.success("Credits updated.");
    } catch (err) {
      toast.error(err.message || "Failed to update credits");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (user?.role !== "admin") {
    return <div className="min-h-screen flex items-center justify-center text-slate-400 bg-background">Access denied.</div>;
  }

  return (
    <div className="min-h-screen bg-background dark:bg-slate-950">
      <div className="relative z-10 py-6" style={{ width: "96%", margin: "0 auto" }}>
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-violet-600 dark:text-violet-400 font-medium mb-6 min-h-[44px]">
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Admin Panel</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
          </div>
        </div>

        {/* Tab Bar */}
        <nav className="grid grid-cols-4 gap-2 mb-6">
          {tabs.map(({ name, label, icon: Icon }) => {
            const active = activeTab === name;
            return (
              <button
                key={name}
                onClick={() => setActiveTab(name)}
                className={`flex flex-col items-center justify-center min-h-[56px] gap-0.5 transition-all duration-200 select-none rounded-2xl ${
                  active
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20"
                    : "text-violet-700 bg-violet-50 border border-violet-100 dark:text-slate-500 dark:bg-slate-900/60 dark:border-transparent hover:bg-violet-100 hover:border-violet-200 hover:text-violet-800 dark:hover:bg-slate-800 dark:hover:text-violet-400"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Tab Content */}
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>

          {/* Credits Tab */}
          {activeTab === "credits" && (
            <div className="flex flex-col gap-6">
              {/* Reset My Credits */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800 p-8 flex flex-col items-center gap-6">
                <div className="w-full bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 rounded-xl px-6 py-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">My Credits</span>
                  <span className="text-2xl font-bold text-violet-700 dark:text-violet-300">{user.credits ?? 0} 🪙</span>
                </div>
                <button
                  onClick={() => updateCredits(user.id, MAX_CREDITS)}
                  disabled={saving || user.credits >= MAX_CREDITS}
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl min-h-[48px] font-medium shadow-lg shadow-violet-500/25 disabled:opacity-40 flex items-center justify-center"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Reset my balance to {MAX_CREDITS} 🪙
                </button>
                {user.credits >= MAX_CREDITS && (
                  <p className="text-xs text-slate-400 dark:text-slate-500">Credits are already at maximum.</p>
                )}
              </div>

              {/* Add Credits to User */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800 p-6 flex flex-col gap-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Add Credits to User</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by email or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-violet-400"
                  />
                </div>

                {searchQuery.length > 0 && (
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredUsers.length === 0 ? (
                      <p className="text-sm text-slate-400 px-4 py-3">No users found.</p>
                    ) : (
                      filteredUsers.map((u) => (
                        <button key={u.id} onClick={() => { setGrantTarget(u); setSearchQuery(""); }} className="w-full flex items-center justify-between px-4 py-3 hover:bg-violet-50 dark:hover:bg-violet-900/20 text-left">
                          <span>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{u.name || u.email}</p>
                            <p className="text-xs text-slate-400">{u.email}</p>
                          </span>
                          <span className="text-sm font-bold text-violet-600 dark:text-violet-400">{u.credits ?? 0} 🪙</span>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {grantTarget && (
                  <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{grantTarget.name || grantTarget.email}</p>
                      <p className="text-xs text-slate-400">{grantTarget.email} - {grantTarget.credits ?? 0} 🪙</p>
                    </div>
                    <button onClick={() => setGrantTarget(null)} className="text-xs text-slate-400 hover:text-red-400 ml-3">x</button>
                  </div>
                )}

                <div className="flex gap-3 items-center">
                  <input
                    type="number"
                    min="1"
                    max="9999"
                    value={grantAmount}
                    onChange={(e) => setGrantAmount(e.target.value)}
                    className="w-24 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-violet-400 text-center"
                  />
                  <span className="text-sm text-slate-500">🪙</span>
                  <button
                    onClick={() => updateCredits(grantTarget.id, (grantTarget.credits ?? 0) + (parseInt(grantAmount, 10) || 0))}
                    disabled={!grantTarget || saving}
                    className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl min-h-[44px] font-medium shadow disabled:opacity-40 flex items-center justify-center"
                  >
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    Add Credits
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sticker Gallery Tab */}
          {activeTab === "stickers" && (
            <StickerManager />
          )}

          {/* Users Tab */}
          {activeTab === "users" && (
            <UsersTable users={allUsers} />
          )}

          {/* Images Tab */}
          {activeTab === "images" && (
            <ImagesTable />
          )}

        </motion.div>
      </div>
    </div>
  );
}
