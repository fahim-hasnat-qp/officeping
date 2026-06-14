import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { UserRole } from '@officeping/shared';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';
import { useLiveCount } from '@/hooks/useLiveCount';
import { useNotifications } from '@/hooks/useNotifications';
import Toast from '@/components/Toast';
import NotificationStack from '@/components/NotificationStack';

import Login from '@/pages/Login';

// Member pages
import HomeUser from '@/pages/HomeUser';
import Activity from '@/pages/Activity';
import Meals from '@/pages/Meals';
import Profile from '@/pages/Profile';
import Notifications from '@/pages/Notifications';
import SendCompliment from '@/pages/SendCompliment';

// Staff pages
import HomeStaff from '@/pages/HomeStaff';
import RequestsStaff from '@/pages/RequestsStaff';
import MealsStaff from '@/pages/MealsStaff';
import StaffProfile from '@/pages/StaffProfile';

// Shared
import NewRequest from '@/pages/NewRequest';
import RequestDetail from '@/pages/RequestDetail';
import Manage from '@/pages/Manage';

function AppRoutes() {
  const { user, accessToken } = useAuthStore();
  useNotifications();
  useLiveCount();

  useEffect(() => {
    if (accessToken) connectSocket(accessToken);
    return () => disconnectSocket();
  }, [accessToken]);

  if (!accessToken) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const isStaff = user?.role === UserRole.STAFF;
  const isAdmin = user?.role === UserRole.ADMIN;

  return (
    <>
      <Toast />
      <NotificationStack />
      <Routes>
        <Route path="/login" element={<Navigate to="/" replace />} />

        {/* Shared */}
        <Route path="/requests/new" element={<NewRequest />} />
        <Route path="/requests/:id" element={<RequestDetail />} />
        <Route path="/notifications" element={<Notifications />} />

        {isStaff ? (
          <>
            <Route path="/" element={<HomeStaff />} />
            <Route path="/requests" element={<RequestsStaff />} />
            <Route path="/meals" element={<MealsStaff />} />
            <Route path="/profile" element={<StaffProfile />} />
          </>
        ) : (
          <>
            {/* Members and Admins share the same member UI */}
            <Route path="/" element={<HomeUser />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/meals" element={<Meals />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/compliment/:staffId" element={<SendCompliment />} />
            {isAdmin && <Route path="/manage" element={<Manage />} />}
          </>
        )}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}
