import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import FormViewer from "./pages/FormViewer/FormViewer";
import PostList from './components/PostList';
import { authService } from './services/authService';

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
          <Route path="/" element={<FormViewer />} />
          <Route path="/forms/:id" element={<FormViewer />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;