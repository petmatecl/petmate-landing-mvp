import Head from "next/head";
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import ClientLayout from "../components/Client/ClientLayout";
import DashboardContent from "../components/Client/DashboardContent";
import { useRouter } from "next/router";

import RoleGuard from "../components/Shared/RoleGuard";

export default function ClienteDashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
      } else {
        // Optional redirect if needed, layout handles loading mostly
        router.push('/login');
      }
    });
  }, [router]);

  return (
    <RoleGuard requiredRole="cliente">
      <ClientLayout userId={userId} title="Panel cliente — Pawnecta">
        <DashboardContent />
      </ClientLayout>
    </RoleGuard>
  );
}
