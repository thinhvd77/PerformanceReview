import React, {useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../contexts/authContext.jsx';
import loginBg from '../assets/login_bg.png';
import logo from '../assets/LOGO.jpg'

const styles = {
    page: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: `url(${loginBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: '24px',
    },
    card: {
        width: '100%',
        maxWidth: '512px',
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
        padding: '28px',
    },
    header: {
        marginBottom: '16px',
    },
    title: {
        margin: 0,
        fontSize: '24px',
        fontWeight: 700,
        color: '#0f172a',
    },
    subtitle: {
        marginTop: '6px',
        fontSize: '14px',
        color: '#475569',
    },
    error: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: '#fee2e2',
        color: '#b91c1c',
        border: '1px solid #fecaca',
        padding: '10px 12px',
        borderRadius: '10px',
        marginBottom: '16px',
        fontSize: '14px',
    },
    formGroup: {
        marginBottom: '16px',
    },
    label: {
        display: 'block',
        marginBottom: '6px',
        fontSize: '16px',
        color: '#0f172a',
        fontWeight: 600,
    },
    inputWrap: {
        position: 'relative',
    },
    input: {
        width: '100%',
        padding: '12px 14px',
        borderRadius: '10px',
        border: '1px solid #cbd5e1',
        background: '#ffffff',
        color: '#0f172a',
        outline: 'none',
        fontSize: '16px',
    },
    inputInvalid: {
        borderColor: '#fca5a5',
        background: '#fff7f7',
    },
    toggleBtn: {
        position: 'absolute',
        right: '10px',
        top: '50%',
        transform: 'translateY(-50%)',
        padding: '6px 8px',
        fontSize: '12px',
        border: 'none',
        background: 'transparent',
        color: '#0f172a',
        cursor: 'pointer',
    },
    helper: {
        marginTop: '6px',
        fontSize: '14px',
        color: '#b91c1c',
    },
    row: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '4px',
        marginBottom: '16px',
    },
    checkboxRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: '#334155',
        fontSize: '13px',
    },
    button: {
        width: '100%',
        padding: '16px 16px',
        borderRadius: '10px',
        background: 'rgb(174, 28, 63)',
        color: '#ffffff',
        fontWeight: 600,
        fontSize: '16px',
        border: 'none',
        cursor: 'pointer',
        marginTop: '10px',
    },
    buttonDisabled: {
        background: 'gray',
        cursor: 'not-allowed',
    },
};


const Login = () => {
    const navigate = useNavigate();
    const { login, isAdmin } = useAuth();
    const [formData, setFormData] = useState({
        username: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [touched, setTouched] = useState({username: false, password: false});

    const canSubmit = useMemo(() => {
        return !!formData.username && !!formData.password && !loading;
    }, [formData.username, formData.password, loading]);

    const handleChange = (e) => {
        const {name, value} = e.target;
        setFormData((prev) => ({...prev, [name]: value}));
    };

    const handleBlur = (e) => {
        const {name} = e.target;
        setTouched((prev) => ({...prev, [name]: true}));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Mark fields as touched to reveal validation messages if needed
        setTouched({username: true, password: true});
        if (!canSubmit) return;

        setLoading(true);
        try {
            await login(formData);
            // Navigation will be handled automatically by App.jsx based on role
            // Admin users will be redirected to /admin, others to /
            navigate('/');
        } catch (err) {
            setError(err?.response?.data?.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.card} className="login-container">
                <div style={styles.header}>
                    <img src={logo} alt="Logo" style={{width: '100%', height:'auto'}} />
                </div>

                {error && (
                    <div role="alert" aria-live="assertive" style={styles.error} className="error">
                        <span aria-hidden>⚠️</span>
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                    <div style={styles.formGroup}>
                        <label htmlFor="username" style={styles.label}>Tài khoản</label>
                        <div style={styles.inputWrap}>
                            <input
                                id="username"
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                required
                                aria-invalid={touched.username && !formData.username}
                                aria-describedby="username-help"
                                style={{
                                    ...styles.input,
                                    ...(touched.username && !formData.username ? styles.inputInvalid : {}),
                                }}
                            />
                        </div>
                        {touched.username && !formData.username && (
                            <div id="username-help" style={styles.helper}>
                                Vui lòng nhập tài khoản.
                            </div>
                        )}
                    </div>

                    <div style={styles.formGroup}>
                        <label htmlFor="password" style={styles.label}>Mật khẩu</label>
                        <div style={styles.inputWrap}>
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                required
                                minLength={6}
                                aria-describedby="password-help"
                                style={styles.input}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((s) => !s)}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                style={styles.toggleBtn}
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="gray" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                        <line x1="3" y1="3" x2="21" y2="21"></line>
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="gray" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                )}
                            </button>
                        </div>
                        {touched.password && formData.password.length < 6 && (
                            <div id="password-help" style={styles.helper}>
                                Vui lòng nhập mật khẩu.
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={!canSubmit}
                        aria-busy={loading}
                        style={{...styles.button, ...(!canSubmit ? styles.buttonDisabled : {})}}
                    >
                        {loading ? 'Signing in…' : 'Đăng nhập'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;