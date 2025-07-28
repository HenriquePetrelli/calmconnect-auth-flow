import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import Appointments from "./pages/Appointments";
import Statistics from "./pages/Statistics";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
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
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/statistics" element={<Statistics />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
