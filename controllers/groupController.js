
const { fn, col, Op } = require('sequelize');
const { Group, UserGroup, User } = require('../models');

const addGroup = async (req, res) => {
    try {
        const group = await Group.create({
            groupname: req.body.groupname,
            description: req.body.groupdescription,
            created_by: req.user.id
        });
        await UserGroup.create({
            user_id: req.user.id,
            group_id: group.id
        });
        return res.status(201).json({ status:201, message: "Group created successfully", group });
    } catch (error) {   
        console.log("error", error)
        return res.status(400).json({ status:400, message: error.message });
    }
}
const getGroups = async (req, res) => {
    try {
        const userGroups = await UserGroup.findAll({ where: { user_id: req.user.id },attributes:['group_id', 'user_id']});
        const groupIds = userGroups?.map(userGroup => userGroup.group_id);
        const memberCounts = await UserGroup.findAll({
            where: { group_id: groupIds },
            attributes: [
                'group_id',
                [fn('COUNT', col('group_id')), 'memberCount']
            ],
            group: ['group_id']
        });

        const countMap = memberCounts.reduce((acc, item) => {
            acc[item.group_id] = parseInt(item.dataValues.memberCount);
            return acc;
        }, {});

        const groups = await Group.findAll({ where: { id: groupIds } });

        const result = groups.map(group => ({
            ...group.dataValues,
            memberCount: countMap[group.id] || 0
        }));

        return res.status(200).json({ status: 200, message: "Group fetched successfully", groups: result });
    } catch (error) {
        console.log("error :", error);
        return res.status(400).json({ status: 400, message: error.message });
    }
}
const getAllGroups = async (req, res) => {
    try {
        const groups = await Group.findAll({where : { created_by: req.user.id }});
        return res.status(200).json({ status: 200, message: "Group fetched successfully", groups });
    } catch (error) {
        console.log("error", error);
        return res.status(400).json({ status: 400, message: error.message });
    }
}

const getUserToInvite = async (req, res) => {
    try {
        const users = await User.findAll({ where: { id: { [Op.ne]: req.user.id } } });
        return res.status(200).json({ status: 200, message: "User fetched successfully", users });
    } catch (error) {
        console.log("error", error);
        return res.status(400).json({ status: 400, message: error.message });
    }
}
const deleteGroup = async (req, res) => {
    try {
        const group = await Group.destroy({ where: { id: req.params.id, created_by: req.user.id } });
        return res.status(200).json({ status:200, message: "Group deleted successfully", group });
    } catch (error) {   
        console.log("error", error)
        return res.status(400).json({ status:400, message: error.message });
    }
}

const updateGroup = async (req, res) => {
    try {
        const group = await Group.update(req.body, { where: { id: req.params.id, created_by: req.user.id } });
        return res.status(200).json({ status:200, message: "Group updated successfully", group });
    } catch (error) {   
        console.log("error", error)
        return res.status(400).json({ status:400, message: error.message });
    }
}


const getGroupById = async (req, res) => {
    try {
        const group = await Group.findByPk(req.params.id, {
            include: [{ model: User, as: 'members', attributes: ['id', 'name', 'email', 'avatar'] }]
        });
        if (!group) {
            return res.status(404).json({ status: 404, message: "Group not found" });
        }
        return res.status(200).json({ status: 200, message: "Group fetched successfully", group });
    } catch (error) {
        console.log("error", error);
        return res.status(400).json({ status: 400, message: error.message });
    }
}


module.exports = {
    addGroup,
    getGroups,
    getGroupById,
    deleteGroup,
    updateGroup, 
    getAllGroups, 
    getUserToInvite
}