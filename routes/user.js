const express = require('express');

const router = express.Router();

const userController = require('../controllers/user');

const middleware = require('../middleware/auth');

router.post('/signup', userController.signup);

router.post('/login', userController.login)

router.get('/allusers', middleware.authenticate, userController.getUsers);

router.get('/newUsers', middleware.authenticate, userController.nonGroupMembers);

router.get('/:id', middleware.authenticate, userController.removeParticipant);

module.exports = router;
