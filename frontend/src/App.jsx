import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './components/Login';
import FormViewer from "./components/FormViewer.jsx";
import AdminPage from './pages/Admin/AdminPage';
import DashboardPage from './pages/Dashboard/DashboardPage.jsx';
import FormPage from './pages/User/FormPage.jsx';
import SavedExportViewer from './components/SavedExportViewer.jsx';
import { useAuth } from './contexts/authContext.jsx';

const PrivateRoute = ({ children, adminOnly = false, allowedRoles = [] }) => {
    const { user } = useAuth();
    const location = useLocation();

    if (!user) {
        // Lưu nơi người dùng định vào để login xong quay lại
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    const userRole = (user.role || '').toString().toLowerCase();

    if (adminOnly && userRole !== 'admin') {
        return <Navigate to="/" replace />;
    }

    if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
        const normalizedAllowed = allowedRoles.map((role) => role.toLowerCase());
        if (!normalizedAllowed.includes(userRole)) {
            return <Navigate to="/" replace />;
        }
    }

    return children;
};

const GuestOnly = ({ children }) => {
    const { isAuthenticated, isAdmin, isManager } = useAuth();
    if (!isAuthenticated) return children;
    // Đã đăng nhập: không cho vào lại /login
    const target = isAdmin ? '/admin' : isManager ? '/' : '/';
    return <Navigate to={target} replace />;
};

const AuthRedirect = () => {
    const { isAuthenticated, isAdmin, isManager } = useAuth();
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    // Admin sang trang admin, user thường vào trang form
    if (isAdmin) {
        return <Navigate to="/admin" replace />;
    }
    // if (isManager) {
    //     return <Navigate to="/" replace />;
    // }
    return <FormPage />;
};

function App() {
    return (
        <div className="App">
            <Routes>
                <Route
                    path="/login"
                    element={
                        <GuestOnly>
                            <Login />
                        </GuestOnly>
                    }
                />
                <Route path="/" element={<AuthRedirect />} />
                <Route
                    path="/forms/:id"
                    element={
                        <PrivateRoute>
                            <FormViewer />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/dashboard"
                    element={
                        <PrivateRoute allowedRoles={["manager"]}>
                            <DashboardPage />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/admin"
                    element={
                        <PrivateRoute adminOnly={true}>
                            <AdminPage />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/saved-exports/:id"
                    element={
                        <PrivateRoute>
                            <SavedExportViewer />
                        </PrivateRoute>
                    }
                />
                {/* Catch all */}
                <Route path="*" element={<AuthRedirect />} />
            </Routes>
        </div>
    );
}

export default App;
