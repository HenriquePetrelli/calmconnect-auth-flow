import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { AdminProvider } from "@/contexts/AdminContext";
import Index from "./pages/Index";
import PatientLogin from "./pages/PatientLogin";
import PsychologistLogin from "./pages/PsychologistLogin";
import PatientSignUp from "./pages/PatientSignUp";
import PsychologistSignUp from "./pages/PsychologistSignUp";
import Home from "./pages/Home";
import SoundsLibrary from "./pages/SoundsLibrary";
import SoundCategory from "./pages/SoundCategory";
import SoundPlayer from "./pages/SoundPlayer";
import SoundFeedback from "./pages/SoundFeedback";
import GuidedBreathing from "./pages/GuidedBreathing";
import SOS from "./pages/SOS";
import Profile from "./pages/Profile";
import AccountSettings from "./pages/AccountSettings";
import Appointments from "./pages/Appointments";
import Statistics from "./pages/Statistics";
import SubscriptionPlans from "./pages/SubscriptionPlans";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import SubscriptionCancel from "./pages/SubscriptionCancel";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminRoute from "./components/AdminRoute";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AdminProvider>
        <SubscriptionProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/patient-login" element={<PatientLogin />} />
          <Route path="/psychologist-login" element={<PsychologistLogin />} />
          <Route path="/patient-signup" element={<PatientSignUp />} />
          <Route path="/psychologist-signup" element={<PsychologistSignUp />} />
          <Route path="/home" element={<Home />} />
          <Route path="/sounds" element={<SoundsLibrary />} />
          <Route path="/sounds/category/:categoryId" element={<SoundCategory />} />
          <Route path="/sounds/subcategory/:subcategoryId" element={<SoundCategory />} />
          <Route path="/sounds/player/:soundId" element={<SoundPlayer />} />
          <Route path="/sounds/player/playlist/:playlistId" element={<SoundPlayer />} />
          <Route path="/sounds/feedback" element={<SoundFeedback />} />
          <Route path="/breathing" element={<GuidedBreathing />} />
          <Route path="/sos" element={<SOS />} />
           <Route path="/profile" element={<Profile />} />
           <Route path="/account-settings" element={<AccountSettings />} />
           <Route path="/appointments" element={<Appointments />} />
           <Route path="/statistics" element={<Statistics />} />
           <Route path="/subscription-plans" element={<SubscriptionPlans />} />
           <Route path="/subscription-success" element={<SubscriptionSuccess />} />
           <Route path="/subscription-cancel" element={<SubscriptionCancel />} />
           <Route path="/admin/login" element={<AdminLogin />} />
           <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
           {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
        </SubscriptionProvider>
      </AdminProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
