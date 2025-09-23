// contexts/authContext.jsx
import {createContext, useContext, useEffect, useState, useCallback} from 'react';
import {useNavigate} from 'react-router-dom';
import api from "../services/api.js";
import {decodeJWT} from "../utils/decodeJWT.js";

const AuthContext = createContext(null);

export function AuthProvider({children}) {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);

    // Kiểm tra token/user khi thoát trang hoặc reload
    useEffect(() => {
        const bootstrap = async () => {
            const token = localStorage.getItem('token');
            const userStr = localStorage.getItem('user');

            if (!token) {
                // Không có token -> coi như chưa đăng nhập, nhưng KHÔNG cần clear nữa
                setUser(null);
                return;
            }

            // 1) Thử decode đồng bộ (đảm bảo decodeJWT KHÔNG async)
            let payload = null;
            try {
                payload = decodeJWT(token); // trả về object hoặc null
                if (payload) {
                    const now = Math.floor(Date.now() / 1000);
                    const leeway = 60; // 60s chống lệch giờ
                    if (typeof payload.exp === 'number') {
                        // exp theo giây (chuẩn JWT). Nếu backend trả ms, cần /1000.
                        if (payload.exp + leeway < now) {
                            // có exp và hết hạn rõ ràng -> để server xác nhận lại trước khi xoá
                            payload = null;
                        }
                    } else {
                        // Không có exp -> không coi là lỗi; để server xác nhận
                    }
                }
            } catch {
                // decode lỗi -> sẽ xác nhận qua server
                payload = null;
            }

            // 2) Nếu còn userStr hợp lệ thì set trước (optimistic UI)
            if (userStr) {
                try {
                    const parsed = JSON.parse(userStr);
                    setUser(parsed);
                } catch {
                    // userStr hỏng: bỏ qua, không setUser nhưng cũng KHÔNG xoá token vội
                }
            } else {
                // Không có userStr nhưng có token -> vẫn để server xác nhận
                setUser(null);
            }

            // 3) Xác thực chắc chắn với server (nguồn chân lý)
            try {
                const me = await api.get('/users/profile'); // backend trả 200 nếu token hợp lệ
                // Đồng bộ lại user (role lấy từ server cho chắc)
                if (me?.data) {
                    setUser(me.data);
                    localStorage.setItem('user', JSON.stringify(me.data));
                }
            } catch (err) {
                // Server nói token không hợp lệ -> lúc này mới xoá
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setUser(null);
            }
        };

        bootstrap().then();
    }, []);


    /** Đăng xuất + điều hướng chắc chắn về /login */
    const logout = useCallback(() => {
        try {
            // First clear the auth data
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.clear();

            // Update all states in one batch to avoid race conditions
            Promise.resolve().then(() => {
                setUser(null);
                // Navigate immediately after state updates
                navigate('/login', {replace: true});
            }).catch(() => {
                // Fallback to window.location if navigation fails
                window.location.replace('/login');
            });
        } catch (error) {
            console.error('Logout error:', error);
            // Force redirect if something goes wrong
            window.location.replace('/login');
        }
    }, [navigate]);

    /**
     * Đăng nhập: gọi API, đồng bộ state; điều hướng do trang Login quyết định.
     */
    const login = useCallback(
        async (credentials) => {
            const {data} = await api.post('users/login', credentials);
            console.log(data)
            if (data?.token) {
                const token = data.token;
                localStorage.setItem('token', token);
                const payload = decodeJWT(token) || {};
                const role = payload.role;
                const userObj = {...(data.user || {}), role};
                localStorage.setItem('user', JSON.stringify(userObj));
                setUser(userObj);
                return userObj;
            } else {
                throw new Error("No token received");
            }
        },
        []
    );

    const normalizedRole = (user?.role || '').toString().toLowerCase();
    const isAuthenticated = !!user;
    const isAdmin = normalizedRole === 'admin';
    const isManager = normalizedRole === 'manager';

    return <AuthContext.Provider
        value={{user, login, logout, isAuthenticated, isAdmin, isManager}}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    return useContext(AuthContext);
}
