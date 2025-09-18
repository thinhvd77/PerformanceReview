import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import FormViewer from "./components/FormViewer.jsx";
import AdminPage from './pages/Admin/AdminPage';
import FormPage from './pages/User/FormPage.jsx';
import SavedExportViewer from './components/SavedExportViewer.jsx';
import { useAuth } from './contexts/authContext.jsx';

const PrivateRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isAdmin } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // If non-admin tries to access admin routes, redirect to home
  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

const AuthRedirect = () => {
  const { isAuthenticated, isAdmin } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Always redirect admin to admin page
  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }
  
  // Regular users go to user picker
  return <FormPage />;
};

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<AuthRedirect />} />
          <Route path="/forms/:id" element={<PrivateRoute><FormViewer /></PrivateRoute>} />
          <Route path="/admin" element={<PrivateRoute adminOnly={true}><AdminPage /></PrivateRoute>} />
          <Route path="/saved-exports/:id" element={<PrivateRoute><SavedExportViewer /></PrivateRoute>} />
          {/* Catch all route - redirect to appropriate page based on auth */}
          <Route path="*" element={<AuthRedirect />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;