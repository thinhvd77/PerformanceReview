import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database.js';
import { User } from '../entities/User.js';

const userRepository = AppDataSource.getRepository(User);

export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body || {};
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'currentPassword and newPassword are required' });
        }
        const user = await userRepository.findOne({ where: { id: req.user.id } });
        if (!user) return res.status(404).json({ message: 'User not found' });
        const isValid = await bcrypt.compare(currentPassword, user.password || '');
        if (!isValid) return res.status(400).json({ message: 'Current password is incorrect' });
        user.password = await bcrypt.hash(newPassword, 10);
        await userRepository.save(user);
        return res.json({ message: 'Password changed successfully' });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// List users with filtering, pagination and search
export const listUsers = async (req, res) => {
    try {
        // Pagination params
        const page = Math.max(1, parseInt(req.query.page || '1', 10));
        const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize || '50', 10)));

        // Filter params
        const search = (req.query.search || '').toString().trim();
        const role = (req.query.role || '').toString().trim();
        const branch = (req.query.branch || '').toString().trim();
        const department = (req.query.department || '').toString().trim();
        const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

        // Build query builder
        const qb = userRepository.createQueryBuilder('u')
            .select(['u.id', 'u.username', 'u.fullname', 'u.role', 'u.branch', 'u.department', 'u.createdAt', 'u.updatedAt']);

        // Apply filters
        if (search) {
            qb.andWhere(
                '(LOWER(u.username) LIKE :search OR LOWER(u.fullname) LIKE :search)',
                { search: `%${search.toLowerCase()}%` }
            );
        }

        if (role) {
            qb.andWhere('u.role = :role', { role });
        }

        if (branch) {
            qb.andWhere('u.branch = :branch', { branch });
        }

        if (department) {
            qb.andWhere('u.department = :department', { department });
        }

        if (startDate) {
            qb.andWhere('u.createdAt >= :startDate', { startDate });
        }

        if (endDate) {
            qb.andWhere('u.createdAt <= :endDate', { endDate });
        }

        const branchRolePriorityCase = `
            CASE
                WHEN u.branch = 'hs' AND u.department = 'gd' AND u.role = 'director' THEN 0
                WHEN u.branch = 'hs' AND u.department = 'gd' AND u.role = 'deputy_director' THEN 1
                WHEN u.branch = 'hs' AND u.department = 'gd' THEN 2
                WHEN u.branch = 'hs' THEN 3
                WHEN u.branch = 'cn6' THEN 4
                WHEN u.branch = 'nh' THEN 5
                ELSE 6
            END
        `.trim();

        const rolePriorityCase = `
            CASE
                WHEN u.branch = 'hs' AND u.department = 'gd' AND u.role = 'director' THEN 0
                WHEN u.branch = 'hs' AND u.department = 'gd' AND u.role = 'deputy_director' THEN 1
                WHEN u.role = 'manager' OR (u.role = 'director' AND NOT (u.branch = 'hs' AND u.department = 'gd')) THEN 2
                WHEN u.role = 'deputy_manager' OR (u.role = 'deputy_director' AND NOT (u.branch = 'hs' AND u.department = 'gd')) THEN 3
                WHEN u.role = 'employee' THEN 4
                WHEN u.role = 'admin' THEN 5
                ELSE 6
            END
        `.trim();

        // Apply pagination with custom ordering (HS leadership first, then departments, CN6 và NH)
        qb.orderBy(branchRolePriorityCase, 'ASC')
            .addOrderBy('u.department', 'ASC')
            .addOrderBy(rolePriorityCase, 'ASC')
            .addOrderBy('u.fullname', 'ASC')
            .skip((page - 1) * pageSize)
            .take(pageSize);

        // Get results with total count
        const [data, total] = await qb.getManyAndCount();

        // Respond data with specific fields 
        res.json({
            data: data.map(user => ({
                username: user.username,
                fullname: user.fullname,
                branch: user.branch,
                department: user.department,
                role: user.role,
            })),
            metadata: {
                total,
                page,
                pageSize,
                totalPages: Math.ceil(total / pageSize)
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get single user by id
export const getUserById = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const user = await userRepository.findOne({ where: { id }, select: ['id', 'username', 'fullname', 'role', 'createdAt', 'updatedAt'] });
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const register = async (req, res) => {
    try {
        const { username, password, role, fullname, department, branch } = req.body;

        // Check if user exists
        const existingUser = await userRepository.findOne({
            where: { username },
        });

        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = userRepository.create({
            username,
            password: hashedPassword,
            role,
            fullname,
            department,
            branch
        });

        await userRepository.save(user);

        res.status(201).json({
            message: 'User created successfully',
            user: { username: user.username, fullname: user.fullname, branch: user.branch, department: user.department},
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Find user
        const user = await userRepository.findOne({ where: { username } });

        if (!user) {
            return res.status(401).json({ message: 'Người dùng không tồn tại' });
        }

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return res.status(401).json({ message: 'Mật khẩu không đúng' });
        }

        // Generate token
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: { username: user.username, fullname: user.fullname, role: user.role, department: user.department, branch: user.branch },
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const getProfile = async (req, res) => {
    try {
        const user = await userRepository.findOne({
            where: { id: req.user.id },
            select: ['id', 'username', 'fullname', 'role', 'department', 'createdAt'],
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Create user (admin)
export const createUser = async (req, res) => {
    try {
        const { username, password, role, fullname } = req.body;
        if (!username || !password || !role) return res.status(400).json({ message: 'username, password, role are required' });
        const existingUser = await userRepository.findOne({ where: { username } });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = userRepository.create({ username, password: hashedPassword, role, fullname });
        await userRepository.save(user);
        res.status(201).json({ message: 'User created', user: { id: user.id, username: user.username, fullname: user.fullname, role: user.role } });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Update user (admin)
export const updateUser = async (req, res) => {
    try {
        const username = req.params.id;
        const { password, role, fullname, branch, department } = req.body;
        const user = await userRepository.findOne({ where: { username } });
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (username && username !== user.username) {
            const dup = await userRepository.findOne({ where: { username } });
            if (dup) return res.status(400).json({ message: 'Username already taken' });
            user.username = username;
        }
        if (typeof fullname === 'string') user.fullname = fullname;
        if (typeof role === 'string') user.role = role;
        if (typeof branch === 'string') user.branch = branch;
        if (typeof department === 'string') user.department = department;
        if (password) user.password = await bcrypt.hash(password, 10);
        await userRepository.save(user);
        res.json({ message: 'User updated', user: { id: user.id, username: user.username, fullname: user.fullname, role: user.role, branch: user.branch, department: user.department } });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Delete user (admin)
export const deleteUser = async (req, res) => {
    try {
        const username = req.params.id;
        const user = await userRepository.findOne({ where: { username } });
        if (!user) return res.status(404).json({ message: 'User not found' });
        await userRepository.remove(user);
        res.json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
