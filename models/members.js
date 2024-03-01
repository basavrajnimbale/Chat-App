const Sequelize = require('sequelize');
const sequelize = require('../util/database');

const Member = sequelize.define('member',
    {
        id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true
        },
        name: Sequelize.STRING,
        group: Sequelize.STRING,
        isAdmin: Sequelize.BOOLEAN
    });

module.exports = Member;