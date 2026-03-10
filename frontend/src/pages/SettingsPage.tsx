import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure your store</p>
      </div>
      <div className="glass-card p-6 flex flex-col items-center justify-center min-h-[200px]">
        <Settings className="w-12 h-12 text-primary/40 mb-3" />
        <h3 className="font-semibold">Store Settings</h3>
        <p className="text-sm text-muted-foreground text-center mt-1">
          Store name, tax rates, receipt template, and more coming soon
        </p>
      </div>
    </div>
  );
}
