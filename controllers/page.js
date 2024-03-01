exports.getSignupPage = (req, res, next) => {
    res.sendFile('/signup.html', {root: 'views'}, (err) => {
        if (err) {
            console.error(err);
            res.status(500).send('Internal Server Error');
        }
    });
}