import { Route, Switch, Router as WouterRouter, useLocation, Redirect } from 'wouter';
import { useEffect, useLayoutEffect } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { useAuth } from '@/lib/auth-context';
import { Toaster } from '@/components/ui/toaster';

function ScrollToTop() {
  const [pathname] = useLocation();

  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useLayoutEffect(() => {
    let frame = 0;
    let delayedReset = 0;

    const reset = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      document.scrollingElement?.scrollTo(0, 0);
    };

    reset();
    frame = window.requestAnimationFrame(() => {
      reset();
      delayedReset = window.setTimeout(reset, 80);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(delayedReset);
    };
  }, [pathname]);

  return null;
}

import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import Dashboard from '@/pages/Dashboard';
import Generator from '@/pages/Generator';
import Plans from '@/pages/Plans';
import Profile from '@/pages/Profile';
import EditProfile from '@/pages/EditProfile';
import AdminEditProfile from '@/pages/AdminEditProfile';
import Disabled from '@/pages/Disabled';
import ForgotPassword from '@/pages/ForgotPassword';
import VerifyEmail from '@/pages/VerifyEmail';
import NotFound from '@/pages/NotFound';
import AdminDashboard from '@/pages/admin/Dashboard';
import AdminUsers from '@/pages/admin/Users';
import AdminPlans from '@/pages/admin/Plans';
import AdminCredits from '@/pages/admin/Credits';
import AdminVoices from '@/pages/admin/Voices';
import AdminApiSettings from '@/pages/admin/ApiSettings';
import AdminPayments from '@/pages/admin/Payments';
import AdminSettings from '@/pages/admin/Settings';
import AdminSmtpSettings from '@/pages/admin/SmtpSettings';
import AdminChat from '@/pages/admin/Chat';
import BuyPlan from '@/pages/BuyPlan';
import BuyPlanCheckout from '@/pages/BuyPlanCheckout';
import LiveChat from '@/pages/LiveChat';
import Credits from '@/pages/Credits';
import About from '@/pages/About';
import Contact from '@/pages/Contact';
import FAQ from '@/pages/FAQ';
import Privacy from '@/pages/Privacy';
import Terms from '@/pages/Terms';

/** Guest-only route: wait for auth to resolve before deciding */
function GuestRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  if (loading) return <Component />;
  if (user) return <Redirect to="/dashboard" />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/">{() => <GuestRoute component={Home} />}</Route>
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/verify/email" component={VerifyEmail} />
      <Route path="/generator" component={Generator} />
      <Route path="/plans" component={Plans} />
      <Route path="/buyplan/:plan/:method" component={BuyPlanCheckout} />
      <Route path="/buyplan/:plan" component={BuyPlan} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/credits" component={Credits} />
      <Route path="/profile/edit" component={EditProfile} />
      <Route path="/profile/:username/edit" component={AdminEditProfile} />
      <Route path="/profile/:username" component={Profile} />
      <Route path="/account-disabled" component={Disabled} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/plans" component={AdminPlans} />
      <Route path="/admin/credits" component={AdminCredits} />
      <Route path="/admin/voices" component={AdminVoices} />
      <Route path="/admin/api" component={AdminApiSettings} />
      <Route path="/admin/payments" component={AdminPayments} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/smtp" component={AdminSmtpSettings} />
      <Route path="/admin/chat/:chatId" component={AdminChat} />
      <Route path="/admin/chat" component={AdminChat} />
      <Route path="/live/chat/:chatId" component={LiveChat} />
      <Route path="/live/chat" component={LiveChat} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path="/faq" component={FAQ} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <HelmetProvider>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <ScrollToTop />
        <Router />
      </WouterRouter>
      <Toaster />
    </HelmetProvider>
  );
}
