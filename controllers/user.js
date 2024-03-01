const User = require('../models/users');
const Group = require('../models/groups')
const Member = require('../models/members')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Message = require('../models/messages')
const { Op } = require('sequelize');
const { Sequelize } = require('sequelize');

function isStringInvalid(string) {
    return string === undefined || string.length === 0;
}

const signup = async (req, res, next) => {
    try {
        const { name, email, phonenumber, password } = req.body;
        
        if (isStringInvalid(name) || isStringInvalid(email) || isStringInvalid(phonenumber) || isStringInvalid(password)) {
            return res.status(400).json({ error: "Bad parameters. Something is missing." });
        }

        // Check if user with the provided email already exists
        const existingUser = await User.findOne({ where: { email: email } });

        if (existingUser) {
            return res.status(409).json({ message: "User already exists, Please Login" });
        }

        const saltRounds = 10;
        bcrypt.hash(password, saltRounds, async (err, hash) => {
            if (err) {
                return res.status(500).json({ error: "Error hashing password." });
            }
            await User.create({ name, email, phonenumber, password: hash });
            return res.status(201).json({ message: 'Successfuly create new user' });
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "Internal server error." });
    }
};

function generateAccessToken (id, name) {
    return jwt.sign({ userId: id, name: name }, process.env.TOKEN_SECRET)
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (isStringInvalid(email) || isStringInvalid(password)) {
            return res.status(400).json({ message: 'Email id or password missing', success: false })
        }
        const user = await User.findAll({ where: { email } })
        if (user.length > 0) {
            bcrypt.compare(password, user[0].password, (err, result) => {
                if (err) {
                    res.status(500).json({ success: false, message: 'Something wend wrong' })
                }
                if (result == true) {
                    res.status(200).json({ success: true, message: "user logged in successfully", token: generateAccessToken(user[0].id, user[0].name) })
                }
                else {
                    return res.status(401).json({ success: false, message: 'password is incorrect' })
                }
            })
        } else {
            return res.status(404).json({ success: false, message: 'user doesnot exitst' })
        }
    } catch (err) {
        res.status(500).json({ message: err, success: false })
    }
}

const getUsers = async (req, res, next) => {
    try {
        const allUser = await User.findAll({ where: { id: { [Op.ne]: req.user.id } } })
        res.status(200).json(allUser);
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ "message": "Something went wrong!", "Error": err });
    }
}

const nonGroupMembers = async (req, res, next) => {
    try {
        const groupId = req.query.id;

        // Find the group
        const group = await Group.findOne({ where: { id: groupId } });

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Find all members of the group
        const members = await Member.findAll({ where: { groupId } });
        const memberIds = members.map(member => member.userId);

        // Find all users who are not members of the group
        const nonGroupMembers = await User.findAll({
            where: {
                id: { [Sequelize.Op.notIn]: memberIds }
            },
            attributes: ['id', 'name']
        });

        res.status(200).json({ nonGroupMembers });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const removeParticipant = async (req, res, next) => {
    try {
        const grpId = req.query.id;
        const group = await Group.findByPk(grpId);
        
        const [user] = await group.getUsers({ where: { id: req.user.id } });

        console.log('are you an admin?',user.isAdmin, user.member.isAdmin);
        if (!user.member.isAdmin) {
            return res.status(401).json({ "message": "You're not an admin to remove someone from group." });
        }

        const userId = req.params.id;
        console.log('UserId:', userId);

        const reqUser = await Member.findOne({ where: { id: userId } });
        console.log('User to be removed:', reqUser);

        if (!reqUser) {
            return res.status(404).json({ "message": "User not found in the group." });
        }

        // Remove the user from the group using removeUser method
        const result = await reqUser.destroy();
        res.status(200).json({ "message": 'Participant removed from the group', result });
    }
    catch (err) {
        console.log(err, 'find the error');
        res.status(500).json({ "message": "Something went wrong!", "Error": err });
    }
}

module.exports = {
    signup,
    login, 
    getUsers,
    nonGroupMembers,
    removeParticipant
};
