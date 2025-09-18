import {createContext, useContext, useState, useEffect, useCallback} from "react";
import jwtDecode from 'jwt-decode';
import {useNavigate, useLocation} from 'react-router-dom';

const AuthContext = createContext(null);

export function AuthProvider({children}) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [error, setError] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isEmployee, setIsEmployee] = useState(false);
    const [isManager, setIsManager] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Khi app load lại thì check token trong localStorage
    useEffect(() => {
        if (token) {
            const payload = jwtDecode(token);
            if (payload) {
                setUser(payload);
            } else {
                localStorage.removeItem("token");
                setToken(null);
            }
        }
    }, [token]);

    const login = async (username, password) => {
        const res = await fetch("http://localhost:5000/api/users/login", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({username, password}),
        });
        if (!res.ok) throw new Error("Login failed");
        const data = await res.json();

        localStorage.setItem("token", data.token);
        setToken(data.token);
        setUser(jwtDecode(data.user));
    };

    const logout = useCallback(() => {
        const user = localStorage.getItem('user') ? jwtDecode(localStorage.getItem('user')) : null;
        if (user) {
            localStorage.removeItem('user');
            setUser(null);
            setIsAdmin(false);
            setIsEmployee(false);
            setIsManager(false);
        }
    }, []);
}