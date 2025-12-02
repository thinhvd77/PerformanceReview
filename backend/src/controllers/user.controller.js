import { logActivity } from '../services/activityLog.service.js';
import { getPaginationParams } from '../utils/helpers.js';
import {
    changePasswordService,
    listUsersService,
    getUserByIdService,
    registerService,
    loginService,
    getProfileService,
    createUserService,
    updateUserService,
    deleteUserService
} from '../services/user.service.js';

export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body || {};
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'currentPassword and newPassword are required' });
        }

        const result = await changePasswordService(req.user.id, currentPassword, newPassword);
        if (!result.success) {
            return res.status(result.status).json({ message: result.message });
        }
        return res.json({ message: result.message });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const listUsers = async (req, res) => {
    try {
        const { page, pageSize, skip } = getPaginationParams(req.query, 50, 100);

        const filters = {
            page,
            pageSize,
            skip,
            search: (req.query.search || '').toString().trim(),
            role: (req.query.role || '').toString().trim(),
            branch: (req.query.branch || '').toString().trim(),
            department: (req.query.department || '').toString().trim(),
            startDate: req.query.startDate ? new Date(req.query.startDate) : null,
            endDate: req.query.endDate ? new Date(req.query.endDate) : null
        };

        const result = await listUsersService(filters);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const getUserById = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const user = await getUserByIdService(id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const register = async (req, res) => {
    try {
        const result = await registerService(req.body);
        if (!result.success) {
            return res.status(result.status).json({ message: result.message });
        }
        res.status(201).json({ message: 'User created successfully', user: result.user });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await loginService(username, password);

        if (!result.success) {
            return res.status(result.status).json({ message: result.message });
        }

        // Log successful login activity
        await logActivity(
            result.user.id,
            result.user.username,
            'LOGIN',
            {
                fullname: result.user.fullname,
                role: result.user.role,
                branch: result.user.branch,
                department: result.user.department,
            },
            req
        );

        res.json({
            message: 'Login successful',
            token: result.token,
            user: {
                username: result.user.username,
                fullname: result.user.fullname,
                role: result.user.role,
                department: result.user.department,
                branch: result.user.branch
            },
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const getProfile = async (req, res) => {
    try {
        const user = await getProfileService(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const createUser = async (req, res) => {
    try {
        const { username, password, role } = req.body;
        if (!username || !password || !role) {
            return res.status(400).json({ message: 'username, password, role are required' });
        }

        const result = await createUserService(req.body);
        if (!result.success) {
            return res.status(result.status).json({ message: result.message });
        }
        res.status(201).json({ message: 'User created', user: result.user });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const updateUser = async (req, res) => {
    try {
        const username = req.params.id;
        const result = await updateUserService(username, req.body);

        if (!result.success) {
            return res.status(result.status).json({ message: result.message });
        }
        res.json({ message: 'User updated', user: result.user });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const username = req.params.id;
        const result = await deleteUserService(username);

        if (!result.success) {
            return res.status(result.status).json({ message: result.message });
        }
        res.json({ message: result.message });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
