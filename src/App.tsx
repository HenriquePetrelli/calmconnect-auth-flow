import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { lazy, Suspense } from "react";
import RouteGuard from "@/components/RouteGuard";
import MainLayout from "@/components/MainLayout";
import BackgroundWrapper from "@/components/BackgroundWrapper";
import PageSkeleton from "@/components/PageSkeleton";

// Persistent layout: MainLayout stays mounted across nested routes,
// so sidebar/bottom nav never re-render when switching between them.
const MainLayoutOutlet = () => (
  <MainLayout>
    <Outlet />
  </MainLayout>
);

// Lazy load all pages for better performance
const Index = lazy(() => import("./pages/Index"));
const SignupType = lazy(() => import("./pages/SignupType"));
const PatientSignUp = lazy(() => import("./pages/PatientSignUp"));
const PsychologistSignUpPublic = lazy(() => import("./pages/PsychologistSignUpPublic"));
const Home = lazy(() => import("./pages/Home"));
const SoundsLibrary = lazy(() => import("./pages/SoundsLibrary"));
const SoundCategory = lazy(() => import("./pages/SoundCategory"));
const SoundPlayer = lazy(() => import("./pages/SoundPlayer"));
const SoundFeedback = lazy(() => import("./pages/SoundFeedback"));
const GuidedBreathing = lazy(() => import("./pages/GuidedBreathing"));
const SOS = lazy(() => import("./pages/SOS"));
const Profile = lazy(() => import("./pages/Profile"));
const AccountSettings = lazy(() => import("./pages/AccountSettings"));
const Support = lazy(() => import("./pages/Support"));
const PsychologistSupport = lazy(() => import("./pages/PsychologistSupport"));
const Appointments = lazy(() => import("./pages/Appointments"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Statistics = lazy(() => import("./pages/Statistics"));
const Progress = lazy(() => import("./pages/Progress"));
const Achievements = lazy(() => import("./pages/Achievements"));
const ActivityHistory = lazy(() => import("./pages/ActivityHistory"));
const SubscriptionPlans = lazy(() => import("./pages/SubscriptionPlans"));
const SubscriptionSuccess = lazy(() => import("./pages/SubscriptionSuccess"));
const SubscriptionCancel = lazy(() => import("./pages/SubscriptionCancel"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const PsychologistDashboard = lazy(() => import("./pages/PsychologistDashboard"));
const PsychologistProfile = lazy(() => import("./pages/PsychologistProfile"));
const EmergencyCall = lazy(() => import("./pages/EmergencyCall"));
const WebRTCTest = lazy(() => import("./pages/WebRTCTest"));
const Chat = lazy(() => import("./pages/Chat"));
const ConsultationCall = lazy(() => import("./pages/ConsultationCall"));
const SupportGroups = lazy(() => import("./pages/SupportGroups"));
const SupportGroupDetail = lazy(() => import("./pages/SupportGroupDetail"));
const PrivateJournal = lazy(() => import("./pages/PrivateJournal"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 min cache - reduces redundant Supabase calls
      gcTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        disableTransitionOnChange
      >
          <AuthProvider>
            <SubscriptionProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <BackgroundWrapper>
                  <Suspense fallback={<PageSkeleton />}>
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

                  {/* Rotas do Paciente com Layout Principal persistente */}
                  <Route element={<MainLayoutOutlet />}>
                    <Route path="/home" element={
                      <RouteGuard allowedUserTypes={['patient']}>
                        <Home />
                      </RouteGuard>
                    } />
                    <Route path="/chat" element={
                      <RouteGuard allowedUserTypes={['patient', 'psychologist']}>
                        <Chat />
                      </RouteGuard>
                    } />
                    <Route path="/profile" element={
                      <RouteGuard allowedUserTypes={['patient']}>
                        <Profile />
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
                  </Route>


                  {/* Outras rotas do Paciente sem Layout Principal */}
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
                  <Route path="/progress" element={
                    <RouteGuard allowedUserTypes={['patient']}>
                      <Progress />
                    </RouteGuard>
                  } />
                  <Route path="/achievements" element={
                    <RouteGuard allowedUserTypes={['patient']}>
                      <Achievements />
                    </RouteGuard>
                  } />
                  <Route path="/statistics/activity-history" element={
                    <RouteGuard allowedUserTypes={['patient']}>
                      <ActivityHistory />
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
                  </Suspense>
                </BackgroundWrapper>
              </BrowserRouter>
          </SubscriptionProvider>
        </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
  );
};

export default App;
