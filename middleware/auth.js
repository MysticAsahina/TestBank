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

// Middleware to check if user has specific role
export const requireRole = (roles) => {
    return (req, res, next) => {
        console.log('👤 Role check - User role:', req.session.user?.role);
        console.log('👤 Role check - Required roles:', roles);
        
        if (!req.session.user) {
            console.log('❌ No user session in role check');
            return res.redirect('/login?error=Please login to access this page');
        }
        
        if (!roles.includes(req.session.user.role)) {
            console.log('❌ Access denied - User role not authorized');
            return res.status(403).render('Error', {
                title: 'Access Denied',
                message: 'You do not have permission to access this page.',
                user: req.session.user
            });
        }
        
        console.log('✅ Role check passed');
        next();
    };
};