export const setNoCacheHeaders = (req, res, next) => {
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
    });
    next();
};

export const preventCache = (req, res, next) => {
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
    });
    next();
};

export const sessionChecker = (req, res, next) => {
    if (req.path === '/login' || req.path === '/register') {
        if (req.session.user) {
            return res.redirect('/');
        }
    }
    next();
};  