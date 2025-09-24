import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import SplashScreen from "@/components/SplashScreen";
import RouteGuard from "@/components/RouteGuard";
import Index from "./pages/Index";
import SignupType from "./pages/SignupType";
import PatientSignUp from "./pages/PatientSignUp";
import PsychologistSignUpPublic from "./pages/PsychologistSignUpPublic";
import Home from "./pages/Home";
import SoundsLibrary from "./pages/SoundsLibrary";
import SoundCategory from "./pages/SoundCategory";
import SoundPlayer from "./pages/SoundPlayer";
import SoundFeedback from "./pages/SoundFeedback";
import GuidedBreathing from "./pages/GuidedBreathing";
import SOS from "./pages/SOS";
import Profile from "./pages/Profile";
import AccountSettings from "./pages/AccountSettings";
import Support from "./pages/Support";
import PsychologistSupport from "./pages/PsychologistSupport";
import Appointments from "./pages/Appointments";
import Notifications from "./pages/Notifications";
import Statistics from "./pages/Statistics";
import Progress from "./pages/Progress";
import SubscriptionPlans from "./pages/SubscriptionPlans";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import SubscriptionCancel from "./pages/SubscriptionCancel";
import AdminDashboard from "./pages/AdminDashboard";
import PsychologistDashboard from "./pages/PsychologistDashboard";
import PsychologistProfile from "./pages/PsychologistProfile";
import EmergencyCall from "./pages/EmergencyCall";
import WebRTCTest from "./pages/WebRTCTest";
import Chat from "./pages/Chat";
import ConsultationCall from "./pages/ConsultationCall";
import SupportGroups from "./pages/SupportGroups";
import SupportGroupDetail from "./pages/SupportGroupDetail";
import PrivateJournal from "./pages/PrivateJournal";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(t);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider>
          <AuthProvider>
            <SubscriptionProvider>
              <Toaster />
              <Sonner />
            {showSplash ? (
              <SplashScreen />
            ) : (
              <BrowserRouter>
                <Routes>
                  {/* Rotas Públicas */}
                  <Route path="/" element={
                    <RouteGuard allowedUserTypes={['public']}>
                      <Index />
                    </RouteGuard>
                  } />
                  <Route path="/signup-type" element={
                    <RouteGuard allowedUserTypes={['public']}>
                      <SignupType />
                    </RouteGuard>
                  } />
                  <Route path="/patient-signup" element={
                    <RouteGuard allowedUserTypes={['public']}>
                      <PatientSignUp />
                    </RouteGuard>
                  } />
                  <Route path="/psychologist-signup" element={
                    <RouteGuard allowedUserTypes={['public']}>
                      <PsychologistSignUpPublic />
                    </RouteGuard>
                  } />

                  {/* Rotas do Paciente */}
                  <Route path="/home" element={
                    <RouteGuard allowedUserTypes={['patient']}>
                      <Home />
                    </RouteGuard>
                  } />
                  <Route path="/support-groups" element={
                    <RouteGuard allowedUserTypes={['patient']}>
                      <SupportGroups />
                    </RouteGuard>
                  } />
                  <Route path="/support-group/:groupId" element={
                    <RouteGuard allowedUserTypes={['patient']}>
                      <SupportGroupDetail />
                    </RouteGuard>
                  } />
                  <Route path="/journal" element={
                    <RouteGuard allowedUserTypes={['patient']}>
                      <PrivateJournal />
                    </RouteGuard>
                  } />
                  <Route path="/sounds" element={
                    <RouteGuard allowedUserTypes={['patient']}>
                      <SoundsLibrary />
                    </RouteGuard>
                  } />
                  <Route path="/sounds/category/:categoryId" element={
                    <RouteGuard allowedUserTypes={['patient']}>
                      <SoundCategory />
                    </RouteGuard>
                  } />
                  <Route path="/sounds/subcategory/:subcategoryId" element={
                    <RouteGuard allowedUserTypes={['patient']}>
                      <SoundCategory />
                    </RouteGuard>
                  } />
                  <Route path="/sounds/player/:soundId" element={
                    <RouteGuard allowedUserTypes={['patient']}>
                      <SoundPlayer />
                    </RouteGuard>
                  } />
                  <Route path="/sounds/player/playlist/:playlistId" element={
                    <RouteGuard allowedUserTypes={['patient']}>
                      <SoundPlayer />
                    </RouteGuard>
                  } />
                  <Route path="/sounds/feedback" element={
                    <RouteGuard allowedUserTypes={['patient']}>
                      <SoundFeedback />
                    </RouteGuard>
                  } />
                  <Route path="/breathing" element={
                    <RouteGuard allowedUserTypes={['patient']}>
                      <GuidedBreathing />
                    </RouteGuard>
                  } />
                  <Route path="/sos" element={
                    <RouteGuard allowedUserTypes={['patient']}>
                      <SOS />
                    </RouteGuard>
                  } />
                  <Route path="/profile" element={
                    <RouteGuard allowedUserTypes={['patient']}>
                      <Profile />
                    </RouteGuard>
                  } />
                  <Route path="/account-settings" element={
                    <RouteGuard allowedUserTypes={['patient']}>
                      <AccountSettings />
                    </RouteGuard>
                  } />
                  <Route path="/paciente/suporte" element={
                    <RouteGuard allowedUserTypes={['patient']}>
                      <Support />
                    </RouteGuard>
                  } />
                  <Route path="/appointments" element={
                    <RouteGuard allowedUserTypes={['patient']}>
                      <Appointments />
                    </RouteGuard>
                  } />
                  <Route path="/notifications" element={
                    <RouteGuard allowedUserTypes={['patient']}>
                      <Notifications />
                    </RouteGuard>
                  } />
                  <Route path="/statistics" element={
                    <RouteGuard allowedUserTypes={['patient']}>
                      <Statistics />
                    </RouteGuard>
                  } />
                  <Route path="/progress" element={
                    <RouteGuard allowedUserTypes={['patient']}>
                      <Progress />
                    </RouteGuard>
                  } />
                  <Route path="/subscription-plans" element={
                    <RouteGuard allowedUserTypes={['patient']}>
                      <SubscriptionPlans />
                    </RouteGuard>
                  } />
                  <Route path="/subscription-success" element={
                    <RouteGuard allowedUserTypes={['patient']}>
                      <SubscriptionSuccess />
                    </RouteGuard>
                  } />
                  <Route path="/subscription-cancel" element={
                    <RouteGuard allowedUserTypes={['patient']}>
                      <SubscriptionCancel />
                    </RouteGuard>
                  } />
                  <Route path="/webrtc-test" element={
                    <RouteGuard allowedUserTypes={['patient']}>
                      <WebRTCTest />
                    </RouteGuard>
                  } />
                  <Route path="/consultation-call/:appointmentId" element={
                    <RouteGuard allowedUserTypes={['patient']}>
                      <ConsultationCall />
                    </RouteGuard>
                  } />
                  <Route path="/chat" element={
                    <RouteGuard allowedUserTypes={['patient', 'psychologist']}>
                      <Chat />
                    </RouteGuard>
                  } />
                  
                  {/* Rotas de Emergência */}
                  <Route path="/emergency-call" element={
                    <RouteGuard allowedUserTypes={['patient', 'psychologist']}>
                      <EmergencyCall />
                    </RouteGuard>
                  } />
                  
                  {/* Rota de emergência para pacientes (usando requestId) */}
                  <Route path="/emergency-call/request/:requestId" element={
                    <RouteGuard allowedUserTypes={['patient']}>
                      <EmergencyCall />
                    </RouteGuard>
                  } />
                  
                  {/* Rota de emergência para psicólogos e pacientes (usando sessionId) */}
                  <Route path="/emergency-call/:sessionId" element={
                    <RouteGuard allowedUserTypes={['patient', 'psychologist']}>
                      <EmergencyCall />
                    </RouteGuard>
                  } />
                  
                  {/* Rota legacy para psicólogos */}
                  <Route path="/emergency/call/:requestId" element={
                    <RouteGuard allowedUserTypes={['psychologist']}>
                      <EmergencyCall />
                    </RouteGuard>
                  } />

                  {/* Rotas do Psicólogo */}
                  <Route path="/psychologist-dashboard" element={
                    <RouteGuard allowedUserTypes={['psychologist']}>
                      <PsychologistDashboard />
                    </RouteGuard>
                  } />
                  <Route path="/psychologist-profile" element={
                    <RouteGuard allowedUserTypes={['psychologist']}>
                      <PsychologistProfile />
                    </RouteGuard>
                  } />
                  <Route path="/psicologo/suporte" element={
                    <RouteGuard allowedUserTypes={['psychologist']}>
                      <PsychologistSupport />
                    </RouteGuard>
                  } />

                  {/* Rotas do Admin */}
                  <Route path="/admin-dashboard" element={
                    <RouteGuard allowedUserTypes={['admin']}>
                      <AdminDashboard />
                    </RouteGuard>
                  } />

                  {/* Rota 404 */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            )}
          </SubscriptionProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
  );
};

export default App;
