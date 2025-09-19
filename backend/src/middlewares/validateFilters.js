/**
 * Validates user list filter parameters
 */
export const validateUserFilters = (req, res, next) => {
    try {
        // Validate page and pageSize
        const page = parseInt(req.query.page || '1', 10);
        const pageSize = parseInt(req.query.pageSize || '50', 10);

        if (isNaN(page) || page < 1) {
            return res.status(400).json({ message: 'Invalid page number' });
        }

        if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
            return res.status(400).json({ message: 'Invalid page size' });
        }

        // Validate date range
        if (req.query.startDate) {
            const startDate = new Date(req.query.startDate);
            if (isNaN(startDate.getTime())) {
                return res.status(400).json({ message: 'Invalid start date' });
            }
        }

        if (req.query.endDate) {
            const endDate = new Date(req.query.endDate);
            if (isNaN(endDate.getTime())) {
                return res.status(400).json({ message: 'Invalid end date' });
            }

            if (req.query.startDate && endDate < new Date(req.query.startDate)) {
                return res.status(400).json({ message: 'End date must be after start date' });
            }
        }

        // Validate role if provided
        if (req.query.role && !['Admin', 'User'].includes(req.query.role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        // Validate branch if provided
        const validBranches = ['hs', 'cn6', 'nh'];  // Based on the frontend options
        if (req.query.branch && !validBranches.includes(req.query.branch)) {
            return res.status(400).json({ message: 'Invalid branch' });
        }

        // Validate department if provided
        const validDepartments = ['kt', 'pgd', 'kh', 'cn', 'dn', 'th', 'ktgs', 'qlrr', 'gd'];  // Based on the frontend options
        if (req.query.department && !validDepartments.includes(req.query.department)) {
            return res.status(400).json({ message: 'Invalid department' });
        }

        next();
    } catch (error) {
        res.status(400).json({ message: 'Invalid filter parameters', error: error.message });
    }
};