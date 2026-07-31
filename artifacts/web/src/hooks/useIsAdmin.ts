/**
 * useIsAdmin — server-verified admin flag.
 *
 * Calls GET /api/user/me and returns whether the signed-in user is an admin.
 * This is the ONLY place in the frontend that determines admin status —
 * do not add client-side email comparisons elsewhere.
 */

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";

interface UserMe {
  isAdmin: boolean;
  email: string | null;
}

export function useIsAdmin(): { isAdmin: boolean; isLoading: boolean } {
  const { getToken, isSignedIn } = useAuth();

  const { data, isLoading } = useQuery<UserMe>({
    queryKey: ["user-me"],
    enabled: !!isSignedIn,
    staleTime: 5 * 60 * 1000, // 5 min — admin status doesn't change mid-session
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/user/me", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return { isAdmin: false, email: null };
      return res.json();
    },
  });

  return {
    isAdmin: data?.isAdmin ?? false,
    isLoading: !!isSignedIn && isLoading,
  };
}
