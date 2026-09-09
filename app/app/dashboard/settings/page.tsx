export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Settings</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">Manage your account settings and preferences</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">Profile</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Full Name</label>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Not set</p>
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Email</label>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">user@example.com</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">Preferences</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Theme</label>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">System (auto)</p>
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Language</label>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">English</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}