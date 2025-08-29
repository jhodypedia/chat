module.exports = {
    isAuth: (req, res, next) => {
        if (req.session.user) {
            return next();
        }
        res.redirect('/login');
    },
    isGuest: (req, res, next) => {
        if (!req.session.user) {
            return next();
        }
        res.redirect('/chat');
    },
};
