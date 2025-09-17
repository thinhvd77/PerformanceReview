import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {AppDataSource} from '../config/database.js';
import {User} from '../entities/User.js';

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

// List users with optional pagination and search
export const listUsers = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page || '1', 10));
        const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize || '50', 10)));
        const q = (req.query.q || '').toString().trim();

        const where = q
            ? [
                { username: AppDataSource.driver.escape ? undefined : undefined }, // placeholder to keep array shape
              ]
            : {};

        // Build query builder to support LIKE search regardless of driver helper
        const qb = userRepository.createQueryBuilder('u')
            .select(['u.id', 'u.username', 'u.fullname', 'u.role', 'u.createdAt', 'u.updatedAt'])
            .orderBy('u.id', 'ASC')
            .skip((page - 1) * pageSize)
            .take(pageSize);
        if (q) {
            qb.where('LOWER(u.username) LIKE :q OR LOWER(u.fullname) LIKE :q', { q: `%${q.toLowerCase()}%` });
        }
        const [data, total] = await qb.getManyAndCount();
        res.json({ data, total, page, pageSize });
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
        const {username, password, role, fullname} = req.body;

        // Check if user exists
        const existingUser = await userRepository.findOne({
            where: {username},
        });

        if (existingUser) {
            return res.status(400).json({message: 'User already exists'});
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = userRepository.create({
            username,
            password: hashedPassword,
            role,
            fullname,
        });

        await userRepository.save(user);

        res.status(201).json({
            message: 'User created successfully',
            user: {id: user.id, username: user.username, fullname: user.fullname, role: user.role},
        });
    } catch (error) {
        res.status(500).json({message: 'Server error', error: error.message});
    }
};

export const login = async (req, res) => {
    try {
        const {username, password} = req.body;

        // Find user
        const user = await userRepository.findOne({where: {username}});

        if (!user) {
            return res.status(401).json({message: 'Người dùng không tồn tại'});
        }

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return res.status(401).json({message: 'Mật khẩu không đúng'});
        }

        // Generate token
        const token = jwt.sign(
            {id: user.id, username: user.username, role: user.role},
            process.env.JWT_SECRET,
            {expiresIn: '24h'}
        );

        res.json({
            message: 'Login successful',
            token,
            user: {id: user.id, username: user.username, fullname: user.fullname, role: user.role},
        });
    } catch (error) {
        res.status(500).json({message: 'Server error', error: error.message});
    }
};

export const getProfile = async (req, res) => {
    try {
        const user = await userRepository.findOne({
            where: {id: req.user.id},
            select: ['id', 'username', 'fullname', 'role', 'createdAt'],
        });

        if (!user) {
            return res.status(404).json({message: 'User not found'});
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({message: 'Server error', error: error.message});
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
        const id = parseInt(req.params.id, 10);
        const { username, password, role, fullname } = req.body;
        const user = await userRepository.findOne({ where: { id } });
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (username && username !== user.username) {
            const dup = await userRepository.findOne({ where: { username } });
            if (dup) return res.status(400).json({ message: 'Username already taken' });
            user.username = username;
        }
        if (typeof fullname === 'string') user.fullname = fullname;
        if (typeof role === 'string') user.role = role;
        if (password) user.password = await bcrypt.hash(password, 10);
        await userRepository.save(user);
        res.json({ message: 'User updated', user: { id: user.id, username: user.username, fullname: user.fullname, role: user.role } });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Delete user (admin)
export const deleteUser = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const user = await userRepository.findOne({ where: { id } });
        if (!user) return res.status(404).json({ message: 'User not found' });
        await userRepository.remove(user);
        res.json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};