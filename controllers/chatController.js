const { User, Message, Sequelize } = require('../models');
const { Op } = Sequelize;

exports.showChatPage = async (req, res) => {
    try {
        const currentUser = await User.findByPk(req.session.user.id);

        // Logic untuk mengambil daftar percakapan terakhir
        const messages = await Message.findAll({
            where: {
                [Op.or]: [{ senderId: currentUser.id }, { receiverId: currentUser.id }],
            },
            order: [['createdAt', 'DESC']],
            include: [
                { model: User, as: 'Sender', attributes: ['id', 'username', 'avatar'] },
                { model: User, as: 'Receiver', attributes: ['id', 'username', 'avatar'] },
            ],
        });

        const conversations = {};
        messages.forEach(msg => {
            const otherUserId = msg.senderId === currentUser.id ? msg.receiverId : msg.senderId;
            if (!conversations[otherUserId]) {
                const otherUser = msg.senderId === currentUser.id ? msg.Receiver : msg.Sender;
                conversations[otherUserId] = {
                    user: otherUser,
                    lastMessage: msg.message,
                    timestamp: msg.createdAt,
                    unreadCount: 0, // Logic unread bisa ditambahkan di sini
                };
            }
        });

        res.render('chat', {
            title: 'Chat App',
            currentUser,
            conversations: Object.values(conversations),
        });

    } catch (error) {
        console.error(error);
        res.redirect('/login');
    }
};

// API untuk mencari user
exports.searchUsers = async (req, res) => {
    try {
        const { query } = req.query;
        const users = await User.findAll({
            where: {
                username: { [Op.like]: `%${query}%` },
                id: { [Op.ne]: req.session.user.id }, // Exclude self
            },
            attributes: ['id', 'username', 'avatar', 'about'],
            limit: 10,
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

// API untuk mengambil riwayat chat dengan user lain
exports.getChatHistory = async (req, res) => {
    try {
        const otherUserId = req.params.userId;
        const currentUserId = req.session.user.id;

        const messages = await Message.findAll({
            where: {
                [Op.or]: [
                    { senderId: currentUserId, receiverId: otherUserId },
                    { senderId: otherUserId, receiverId: currentUserId },
                ],
            },
            order: [['createdAt', 'ASC']],
            include: [
                { model: User, as: 'Sender', attributes: ['id', 'username', 'avatar'] },
            ],
        });

        // Tandai pesan sebagai sudah dibaca
        await Message.update(
            { status: 'read' },
            {
                where: {
                    senderId: otherUserId,
                    receiverId: currentUserId,
                    status: 'sent',
                },
            }
        );

        res.json(messages);
    } catch (error) {
        console.error('Error fetching chat history:', error);
        res.status(500).json({ error: 'Failed to fetch chat history' });
    }
};
