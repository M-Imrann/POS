import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { profile as profileApi, auth } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, KeyRound } from "lucide-react";
import { toast } from "sonner";

export default function ProfilePage() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    profileApi.get().then(({ profile }) => {
      setFullName(profile.full_name || "");
      setCompanyName(profile.company_name || "");
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await profileApi.update({ fullName, companyName });
      toast.success("Profile updated!");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to update profile");
    }
    setSaving(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) { toast.error("New password must be at least 6 characters"); return; }
    setChangingPassword(true);
    try {
      await auth.changePassword("", newPassword);
      toast.success("Password changed successfully!");
      setNewPassword("");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to change password");
    }
    setChangingPassword(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up max-w-lg">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">{user?.email}</p>
      </div>

      <form onSubmit={handleSaveProfile} className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <User className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Personal Information</h2>
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-name">Full Name</Label>
          <Input id="profile-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-company">Company Name</Label>
          <Input id="profile-company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </form>

      <form onSubmit={handleChangePassword} className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <KeyRound className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Change Password</h2>
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-pw">New Password</Label>
          <Input
            id="new-pw"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Min 6 characters"
            required
          />
        </div>
        <Button type="submit" disabled={changingPassword}>
          {changingPassword ? "Changing..." : "Change Password"}
        </Button>
      </form>
    </div>
  );
}
