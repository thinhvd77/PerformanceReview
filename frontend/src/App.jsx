import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import FormViewer from "./pages/FormViewer/FormViewer";
import { authService } from './services/authService';
import AdminPage from './pages/Admin/AdminPage';
import UserFormPicker from './pages/User/UserFormPicker';

const PrivateRoute = ({ children }) => {
  const user = authService.getCurrentUser();
  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<UserFormPicker />} />
          <Route path="/forms/:id" element={<FormViewer />} />
          <Route path="/admin" element={<PrivateRoute><AdminPage /></PrivateRoute>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;