const {Sequelize}  = require('sequelize')

const sequelize = require('../util/database');

const ArchivedMessage = sequelize.define("archivedmessage", {
    id:{
        type:Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    text:{
        type:Sequelize.STRING,
        allowNull: false
    },
    userId: {
        type:Sequelize.STRING,
        allowNull: false 
    },
    format: Sequelize.STRING,
    groupId: {
        type: Sequelize.INTEGER,
        allowNull: false
    }
});

module.exports = ArchivedMessage;