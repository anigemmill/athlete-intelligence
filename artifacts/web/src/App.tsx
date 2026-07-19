import { lazy, Suspense, useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, Redirect, useLocation } from 'wouter';
import { ClerkProvider, SignUp, useAuth, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { setAuthTokenGetter } from '@workspace/api-client-react';

const FOUNDER_EMAIL = 'anigemmill@theoutsidein.nz';

// ── Public pages (lazy-loaded) ────────────────────────────────────────────────
const LandingPage  = lazy(() => import('@/pages/LandingPage'));
const PricingPage  = lazy(() => import('@/pages/PricingPage'));
const AboutPage    = lazy(() => import('@/pages/AboutPage'));
const ContactPage  = lazy(() => import('@/pages/ContactPage'));
const SecurityPage = lazy(() => import('@/pages/SecurityPage'));
const TermsPage    = lazy(() => import('@/pages/TermsPage'));
const SignInPage   = lazy(() => import('@/pages/SignInPage'));

// ── Authenticated app pages (lazy-loaded) ────────────────────────────────────
const Dashboard         = lazy(() => import('@/pages/Dashboard'));
const FeedPage          = lazy(() => import('@/pages/FeedPage'));
const SchedulePage      = lazy(() => import('@/pages/SchedulePage'));
const ComparePage       = lazy(() => import('@/pages/ComparePage'));
const DossierPage       = lazy(() => import('@/pages/DossierPage'));
const NewAgentPage      = lazy(() => import('@/pages/NewAgentPage'));
const ChatPage          = lazy(() => import('@/pages/ChatPage'));
const AlertsPage        = lazy(() => import('@/pages/AlertsPage'));
const SettingsPage      = lazy(() => import('@/pages/SettingsPage'));
const AdminPage         = lazy(() => import('@/pages/AdminPage'));
const SourcesPage       = lazy(() => import('@/pages/SourcesPage'));
const BillingSuccessPage = lazy(() => import('@/pages/BillingSuccessPage'));

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

// Shared full-page loading spinner used by Suspense fallbacks
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// Registers the Clerk token getter so every customFetch call (react-query hooks)
// automatically sends Authorization: Bearer <token>
function ClerkAuthSync() {
  const { getToken } = useAuth();
  useEffect(() => {
    setAuthTokenGetter(getToken);
    return () => setAuthTokenGetter(null);
  }, [getToken]);
  return null;
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
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        fallbackRedirectUrl={`${basePath}/dashboard`}
      />
    </div>
  );
}

// Protect authenticated routes — forward ALL props (including wouter params) to the page
function ProtectedRoute({ component: Component, ...props }: { component: React.ComponentType<any>; [key: string]: any }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <PageLoader />;
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  return <Component {...props} />;
}

// Redirect the founder to /admin automatically; everyone else sees the dashboard
function DashboardRoute() {
  const { user, isLoaded } = useUser();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoaded && user?.primaryEmailAddress?.emailAddress === FOUNDER_EMAIL) {
      setLocation('/admin');
    }
  }, [isLoaded, user]);

  if (!isLoaded) return <PageLoader />;
  if (user?.primaryEmailAddress?.emailAddress === FOUNDER_EMAIL) return null;
  return <Dashboard />;
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* Public marketing site */}
        <Route path="/" component={LandingPage} />
        <Route path="/pricing" component={PricingPage} />
        <Route path="/about" component={AboutPage} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/security" component={SecurityPage} />
        <Route path="/terms" component={TermsPage} />

        {/* Auth routes — MUST be /*? for Clerk's OAuth sub-paths */}
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />

        {/* Protected app routes */}
        <Route path="/dashboard"><ProtectedRoute component={DashboardRoute} /></Route>
        <Route path="/intelligence"><ProtectedRoute component={FeedPage} /></Route>
        <Route path="/schedule"><ProtectedRoute component={SchedulePage} /></Route>
        <Route path="/chat"><ProtectedRoute component={ChatPage} /></Route>
        <Route path="/alerts"><ProtectedRoute component={AlertsPage} /></Route>
        <Route path="/settings"><ProtectedRoute component={SettingsPage} /></Route>
        <Route path="/admin"><ProtectedRoute component={AdminPage} /></Route>
        <Route path="/sources"><ProtectedRoute component={SourcesPage} /></Route>
        <Route path="/athletes/new"><ProtectedRoute component={NewAgentPage} /></Route>
        <Route path="/athletes/compare"><ProtectedRoute component={ComparePage} /></Route>
        <Route path="/athletes/:id"><ProtectedRoute component={DossierPage} /></Route>

        {/* Billing */}
        <Route path="/billing/success" component={BillingSuccessPage} />

        <Route component={NotFound} />
      </Switch>
    </Suspense>
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
        <ClerkAuthSync />
        <ClerkQueryClientCacheInvalidator />
        <Router />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <HelmetProvider>
      <TooltipProvider>
        <ErrorBoundary>
          <WouterRouter base={basePath}>
            <ClerkProviderWithRoutes />
          </WouterRouter>
        </ErrorBoundary>
        <Toaster />
      </TooltipProvider>
    </HelmetProvider>
  );
}

export default App;
