import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database.js';
import { User } from '../entities/User.js';

const userRepository = AppDataSource.getRepository(User);

/**
 * Change user password
 * @param {number} userId - User ID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const changePasswordService = async (userId, currentPassword, newPassword) => {
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
        return { success: false, status: 404, message: 'User not found' };
    }
    
    const isValid = await bcrypt.compare(currentPassword, user.password || '');
    if (!isValid) {
        return { success: false, status: 400, message: 'Current password is incorrect' };
    }
    
    user.password = await bcrypt.hash(newPassword, 10);
    await userRepository.save(user);
    
    return { success: true, message: 'Password changed successfully' };
};

/**
 * List users with filtering, pagination, and search
 * @param {Object} filters - Filter parameters
 * @returns {Promise<{data: Array, metadata: Object}>}
 */
export const listUsersService = async (filters) => {
    const { page, pageSize, skip, search, role, branch, department, startDate, endDate } = filters;

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

    qb.orderBy(branchRolePriorityCase, 'ASC')
        .addOrderBy('u.department', 'ASC')
        .addOrderBy(rolePriorityCase, 'ASC')
        .addOrderBy('u.fullname', 'ASC')
        .skip(skip)
        .take(pageSize);

    const [data, total] = await qb.getManyAndCount();

    return {
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
    };
};

/**
 * Get user by ID
 * @param {number} id - User ID
 * @returns {Promise<Object|null>}
 */
export const getUserByIdService = async (id) => {
    return userRepository.findOne({
        where: { id },
        select: ['id', 'username', 'fullname', 'role', 'createdAt', 'updatedAt']
    });
};

/**
 * Register new user
 * @param {Object} userData - User data
 * @returns {Promise<{success: boolean, user?: Object, message?: string, status?: number}>}
 */
export const registerService = async (userData) => {
    const { username, password, role, fullname, department, branch } = userData;

    const existingUser = await userRepository.findOne({ where: { username } });
    if (existingUser) {
        return { success: false, status: 400, message: 'User already exists' };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = userRepository.create({
        username,
        password: hashedPassword,
        role,
        fullname,
        department,
        branch
    });

    await userRepository.save(user);

    return {
        success: true,
        user: {
            username: user.username,
            fullname: user.fullname,
            branch: user.branch,
            department: user.department
        }
    };
};

/**
 * Login user
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise<{success: boolean, token?: string, user?: Object, message?: string, status?: number}>}
 */
export const loginService = async (username, password) => {
    const user = await userRepository.findOne({ where: { username } });

    if (!user) {
        return { success: false, status: 401, message: 'Người dùng không tồn tại' };
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
        return { success: false, status: 401, message: 'Mật khẩu không đúng' };
    }

    const token = jwt.sign(
        {
            id: user.id,
            username: user.username,
            role: user.role,
            branch: user.branch,
            department: user.department
        },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
    );

    return {
        success: true,
        token,
        user: {
            id: user.id,
            username: user.username,
            fullname: user.fullname,
            role: user.role,
            department: user.department,
            branch: user.branch
        }
    };
};

/**
 * Get user profile
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>}
 */
export const getProfileService = async (userId) => {
    return userRepository.findOne({
        where: { id: userId },
        select: ['id', 'username', 'fullname', 'role', 'department', 'createdAt']
    });
};

/**
 * Create new user (admin)
 * @param {Object} userData - User data
 * @returns {Promise<{success: boolean, user?: Object, message?: string, status?: number}>}
 */
export const createUserService = async (userData) => {
    const { username, password, role, fullname } = userData;

    const existingUser = await userRepository.findOne({ where: { username } });
    if (existingUser) {
        return { success: false, status: 400, message: 'User already exists' };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = userRepository.create({ username, password: hashedPassword, role, fullname });
    await userRepository.save(user);

    return {
        success: true,
        user: {
            id: user.id,
            username: user.username,
            fullname: user.fullname,
            role: user.role
        }
    };
};

/**
 * Update user (admin)
 * @param {string} username - Username to update
 * @param {Object} updateData - Update data
 * @returns {Promise<{success: boolean, user?: Object, message?: string, status?: number}>}
 */
export const updateUserService = async (username, updateData) => {
    const { password, role, fullname, branch, department, newUsername } = updateData;

    const user = await userRepository.findOne({ where: { username } });
    if (!user) {
        return { success: false, status: 404, message: 'User not found' };
    }

    if (newUsername && newUsername !== user.username) {
        const dup = await userRepository.findOne({ where: { username: newUsername } });
        if (dup) {
            return { success: false, status: 400, message: 'Username already taken' };
        }
        user.username = newUsername;
    }

    if (typeof fullname === 'string') user.fullname = fullname;
    if (typeof role === 'string') user.role = role;
    if (typeof branch === 'string') user.branch = branch;
    if (typeof department === 'string') user.department = department;
    if (password) user.password = await bcrypt.hash(password, 10);

    await userRepository.save(user);

    return {
        success: true,
        user: {
            id: user.id,
            username: user.username,
            fullname: user.fullname,
            role: user.role,
            branch: user.branch,
            department: user.department
        }
    };
};

/**
 * Delete user (admin)
 * @param {string} username - Username to delete
 * @returns {Promise<{success: boolean, message?: string, status?: number}>}
 */
export const deleteUserService = async (username) => {
    const user = await userRepository.findOne({ where: { username } });
    if (!user) {
        return { success: false, status: 404, message: 'User not found' };
    }

    await userRepository.remove(user);
    return { success: true, message: 'User deleted' };
};
