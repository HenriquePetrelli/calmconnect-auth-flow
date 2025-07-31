import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AdminDashboard from "@/pages/AdminDashboard";

const AdminDashboardPage = () => {
  const { user, userType } = useAuth();
  const navigate = useNavigate();

  // Redirect if not admin
  if (userType !== 'admin') {
    navigate('/');
    return null;
  }

  return <AdminDashboard />;
};

export default AdminDashboardPage;