
const { Op } = require('sequelize');
const { Group, Invitation, User, UserGroup, Notification } = require('../models');
const { sendEmail } = require('../utils/emailService');

const addInvitation = async (req, res) => {
    try {
        const { group_id, user_id } = req.body;
        const checkInvitation = await Invitation.findOne({
            where: {
                group_id,
                user_id,
                status: {
                    [Op.or]: ['pending', 'approved']
                }
            }
        });

        if (checkInvitation && checkInvitation.status == 'pending') {
            return res.status(400).json({ status:400, message: 'Invitation already exists' });
        }else if(checkInvitation && checkInvitation.status == 'approved'){
            return res.status(400).json({ status:400, message: 'User is already a member of this group' });
        }else{

            const invitation = await Invitation.create({
                group_id,
                user_id,
                invited_by: req.user.id
            });
            
            const group = await Group.findByPk(group_id);
            const inviter = await User.findByPk(req.user.id);
            const invitedUser = await User.findByPk(user_id);
            
            await Notification.create({
                user_id: user_id,
                message: `${inviter.name} invited you to join the group "${group.groupname}"`,
                type: 'invite',
                related_id: invitation.id
            });

            // Send Invitation Email
            if (invitedUser.is_email_receive) {
                await sendEmail({
                    to_name: invitedUser.name,
                    email: invitedUser.email,
                    subject: 'New Group Invitation',
                    message: `Hi ${invitedUser.name}, \n\n${inviter.name} has invited you to join the group "${group.groupname}". Log in to Expense Tracker to accept the invitation.`,
                });
            }

            res.status(201).json({ status:201, message: "Invitation added successfully", invitation });
        }
    } catch (error) {
        res.status(500).json({status:500, message: error.message });
    }
}

const getInvitations = async (req, res) => {
    try {
        const invitations = await Invitation.findAll({
            where: {
                user_id: req.user.id,
                status: 'pending'
            },
            include: [
                {
                    model: Group,
                    as: 'group',
                    // attributes: ['id', 'groupname']
                },
                {
                    model: User,
                    as: 'inviter',
                    attributes: ['id', 'name', 'avatar']
                },
            ]
        });
        return res.status(200).json({ status:200, message: "Invitation fetched successfully", invitations });
    } catch (error) {
        res.status(500).json({status:400, message: error.message });
    }
}   

const acceptOrRejectInvitation = async (req, res) => {
    try {
        const { invitation_id, status } = req.body;
        const invitation = await Invitation.findOne({ 
            where: { 
                id: invitation_id, 
                user_id: req.user.id, 
                status: 'pending' 
            } 
        });
        
        if (!invitation) {
            return res.status(404).json({ status: 404, message: 'Invitation not found or not pending' });
        }

        await invitation.update({ status: status });

        if (status === 'approved') {
            await UserGroup.create({
                group_id: invitation.group_id,
                user_id: invitation.user_id,
                role: 'member',
            });
        } else {
            await invitation.destroy();
        }
        res.status(200).json({ status: 200, message: `Invitation ${status} successfully`, invitation });
    } catch (error) {
        console.log("error", error)
        res.status(500).json({ status: 500, message: error.message });
    }
}

module.exports = {
    addInvitation,
    acceptOrRejectInvitation,
    getInvitations,
}
