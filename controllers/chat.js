const User = require('../models/users');
const Message = require('../models/messages');
const Group = require('../models/groups')
const Member = require('../models/members')
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const AWS = require('aws-sdk');
const fs = require('fs')
const { CronJob } = require("cron");
const ArchivedMessage = require("../models/archivedChats");

const job = new CronJob("0 * * * * *", archiveMessage);

async function archiveMessage() {
    console.log("Cron job started at", new Date());

    try {
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - 1); // 1 day ago

        const oldChats = await Message.findAll({
            where: {
                createdAt: {
                    [Op.lt]: thresholdDate
                }
            },
        });

        for (const chat of oldChats) {
            console.log(chat)
            await ArchivedMessage.create({
                text: chat.text,
                userId: chat.userId,
                format: chat.format,
                groupId: chat.groupId
            });

            await chat.destroy();
        }

        console.log("Cron job completed successfully at", new Date());
    } catch (error) {
        console.error("Error in cron job:", error);
    }
}

job.start();

const getGrpChats = async (req, res, next) => {
    try {
        const group = await Group.findOne({ where: { id: req.query.id } });
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }
        const user = await group.getUsers({ where: { id: req.user.id } });
        if (!user.length) {
            return res.status(401).json({ message: "You aren't a participant of this group to view the messages!" })
        }
        let chats = await group.getMessages();
        if (chats.length > 20) {
            const startIndex = chats.length - 20;
            const lastTwentyChats = chats.slice(startIndex);
            chats = lastTwentyChats;
        }
        res.status(200).json({ message: 'Chats fetched', chats, "group": group.name });
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ message: "Something went wrong!", err: "Erro" });
    }
}

const knowMembers = async (req, res, next) => {
    try {
        console.log(req.body);
        const { name, members } = req.body;
        const promises = members.map(part => User.findOne({ where: { name: part } }));
        const users = await Promise.all(promises);
        console.log(users, 'another one');
        const group = await Group.create({ name, createdBy: req.user.name });
        console.log(group + 'group created');
        const promises2 = users.map(user => group.addUser(user, { through: { name: user.name, group: group.name } }));
        promises2.push(group.addUser(req.user, { through: { name: req.user.name, group: group.name, isAdmin: true } }));
        const details = await Promise.all(promises2);
        res.status(201).json({ message: 'Group successfully created', details });
    }
    catch (err) {
        console.log(err, 'in adding members');
        res.status(500).json({ message: "Something went wrong!", err: "Error" });
    }
}

const sendMsg = async (req, res, next) => {
    try {
        const { id } = req.query;
        let text = req.body.text;
        console.log(text);
        let format = 'text';
        const group = await Group.findByPk(id);

        if (req.files) {
            const promises1 = req.files.map(file => {
                return new Promise((res, rej) => {
                    fs.readFile(file.path, async (err, data) => {
                        if (err) {
                            console.log(err, 'during read file');
                            rej(err);
                        }
                        else {
                            try {
                                const S3response = await uploadToS3(data, `Images/${req.user.id}/${file.filename}`);
                                res(group.createMessage(
                                    {
                                        text: S3response.Location,
                                        userId: req.user.id,
                                        format: file.mimetype

                                    }
                                ))
                            }
                            catch (err) {
                                console.log(err, 'in S3responce');
                            }
                        }
                    })
                })
            })
            if (text) {
                promises1.push(group.createMessage(
                    { text, userId: req.user.id, format }
                ))
            }
            const chats = await Promise.all(promises1);
            res.status(201).json(chats)
        }
    }
    catch(err){
        console.log(err)
        res.status(500).json({'message': 'something went wrong'})
    }
}


const grpReq = async (req, res, next) => {
        try {
            const { id } = req.params
            const showgrp = await Group.findAll({ where: { id: id } });;
            res.status(201).json(showgrp);
        } catch (error) {
            console.error("Error fetching group details:", error);
            res.status(500).json({ "message": 'Internal server error' });
        }
    };

    const getGrps = async (req, res, next) => {
        try {
            const showgrp = await Group.findAll();
            res.status(201).json(showgrp);
        }
        catch (err) {
            console.log(err)
        }
    }

    const grpDetails = async (req, res, next) => {
        try {
            const group = await Group.findOne({ where: { id: req.query.id } });

            if (!group) {
                return res.status(404).json({ message: 'Group not found' });
            }
            const member = await Member.findAll({ where: { groupId: req.query.id } });
            res.status(200).json({ member });
        } catch (error) {
            console.error(error);
            res.status(500).json({ "message": 'Internal server error' });
        }
    };

    const addAdmin = async (req, res, next) => {
        try {
            const grpId = req.query.id;
            const group = await Group.findByPk(grpId);
            const [user] = await group.getUsers({ where: { id: req.user.id } });
            console.log('are you an admin?', user.member.isAdmin, user.isAdmin);
            if (!user.member.isAdmin) {
                return res.status(401).json({ "message": "You must be an admin to make others admin." });
            }
            const userId = req.params.id;
            const member = await Member.findByPk(userId);
            const updatedParticipant = await member.update({ isAdmin: true });
            res.status(200).json({ "message": 'Success', updatedParticipant });
        }
        catch (err) {
            console.log(err, 'when user update');
            res.status(500).json({ "message": "Something went wrong!", "Error": err });
        }
    }

    const addParticipants = async (req, res, next) => {
        try {
            const { id } = req.query;
            const group = await Group.findByPk(id);
            const [user] = await group.getUsers({ where: { id: req.user.id } });
            console.log('are you an admin?', user.member.isAdmin);
            if (!user.member.isAdmin) {
                return res.status(401).json({ "message": "Only admins can add new participants to the group." });
            }
            const { members } = req.body;
            const promises = members.map(part => User.findOne({ where: { name: part } }));
            const users = await Promise.all(promises);
            const promises2 = users.map(user => group.addUser(user, { through: { name: user.name, group: group.name } }));
            const details = await Promise.all(promises2);
            res.status(201).json({ "message": 'Success', details });
        }
        catch (err) {
            res.status(500).json({ "message": "Something went wrong!", "Error": err });
        }
    }

    const uploadToS3 = (data, filename) => {
        const BUCKET_NAME = 'expensetracking-app';

        let s3bucket = new AWS.S3({
            accessKeyId: process.env.IAM_USER_KEY,
            secretAccessKey: process.env.IAM_USER_SECRET,
        })

        var params = {
            Bucket: BUCKET_NAME,
            Key: filename,
            Body: data,
            ACL: 'public-read'
        }
        return new Promise((reslove, reject) => {
            s3bucket.upload(params, (err, s3response) => {
                if (err) {
                    console.log('Something went wrong', err)
                    reject(err)
                } else {
                    console.log('success', s3response)
                    reslove(s3response);
                }
            })
        })
    }

    module.exports = {
        knowMembers,
        sendMsg,
        getGrps,
        getGrpChats,
        grpDetails,
        grpReq,
        addAdmin,
        addParticipants
    }