import { useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, Redirect, useLocation } from 'wouter';
import { ClerkProvider, SignUp, useAuth, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';

// Public pages
import LandingPage from '@/pages/LandingPage';
import PricingPage from '@/pages/PricingPage';
import AboutPage from '@/pages/AboutPage';
import ContactPage from '@/pages/ContactPage';
import SecurityPage from '@/pages/SecurityPage';
import SignInPage from '@/pages/SignInPage';

// Authenticated app pages
import Dashboard from '@/pages/Dashboard';
import FeedPage from '@/pages/FeedPage';
import SchedulePage from '@/pages/SchedulePage';
import ComparePage from '@/pages/ComparePage';
import DossierPage from '@/pages/DossierPage';
import NewAgentPage from '@/pages/NewAgentPage';
import ChatPage from '@/pages/ChatPage';
import AlertsPage from '@/pages/AlertsPage';
import SettingsPage from '@/pages/SettingsPage';
import AdminPage from '@/pages/AdminPage';

const queryClient = new QueryClient();

// REQUIRED — resolves publishable key from hostname so the same build works across all Clerk custom domains
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// REQUIRED — unconditional proxy url; empty in dev (intentional), auto-set in prod
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

// Strip base path before passing to wouter (Clerk passes full paths)
function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

// Invalidates React Query cache when the signed-in user changes
function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

// Protect authenticated routes — forward ALL props (including wouter params) to the page
function ProtectedRoute({ component: Component, ...props }: { component: React.ComponentType<any>; [key: string]: any }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  return <Component {...props} />;
}

function Router() {
  const { isLoaded, isSignedIn } = useAuth();

  return (
    <Switch>
      {/* Public marketing site */}
      <Route path="/" component={LandingPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/security" component={SecurityPage} />

      {/* Auth routes — MUST be /*? for Clerk's OAuth sub-paths */}
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />

      {/* Protected app routes */}
      <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
      <Route path="/intelligence"><ProtectedRoute component={FeedPage} /></Route>
      <Route path="/schedule"><ProtectedRoute component={SchedulePage} /></Route>
      <Route path="/chat"><ProtectedRoute component={ChatPage} /></Route>
      <Route path="/alerts"><ProtectedRoute component={AlertsPage} /></Route>
      <Route path="/settings"><ProtectedRoute component={SettingsPage} /></Route>
      <Route path="/admin"><ProtectedRoute component={AdminPage} /></Route>
      <Route path="/athletes/new"><ProtectedRoute component={NewAgentPage} /></Route>
      <Route path="/athletes/compare"><ProtectedRoute component={ComparePage} /></Route>
      <Route path="/athletes/:id"><ProtectedRoute component={DossierPage} /></Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Router />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
