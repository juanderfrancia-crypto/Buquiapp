import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') redirect('/login?error=unauthorized');

  return (
    <div className="flex h-full min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <Topbar userEmail={user.email ?? ''} />
        <main className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
