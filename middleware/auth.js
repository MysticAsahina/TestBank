// Middleware to check if user is authenticated
export const requireAuth = (req, res, next) => {
    console.log('🔐 Auth check - Session:', req.session);
    console.log('🔐 Auth check - User:', req.session.user);

    if (!req.session.user) {
        console.log('❌ No user session - redirecting to login');
        return res.redirect('/login?error=Please login to access this page');
    }
    next();
};

// Middleware to check if user has specific role(s)
export const requireRole = (roles) => {
    return (req, res, next) => {
        const user = req.session.user;
        console.log('👤 Role check - User role:', user?.role);
        console.log('👤 Role check - Required roles:', roles);

        if (!user) {
            console.log('❌ No user session in role check');
            return res.redirect('/login?error=Please login to access this page');
        }

        // If role is not authorized
        if (!roles.includes(user.role)) {
            console.log('❌ Access denied - User role not authorized');

            // Role-based redirection
            switch (user.role) {
                case 'Dean':
                    return res.redirect('/dean');
                case 'Professor':
                    return res.redirect('/professor');
                default:
                    return res.redirect('/');
            }
        }

        console.log('✅ Role check passed');
        next();
    };
};
