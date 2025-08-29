const { User, Message } = require('../models');
const userSockets = new Map(); // Menyimpan mapping userId -> socketId

module.exports = (io) => {
    io.on('connection', (socket) => {
        const session = socket.request.session;
        const userId = session.user?.id;

        if (!userId) {
            return socket.disconnect();
        }

        console.log(`✅ User connected: ${userId}, socket: ${socket.id}`);
        userSockets.set(userId.toString(), socket.id);

        // Broadcast status online
        socket.broadcast.emit('user_online', { userId });

        // Handler untuk pesan baru
        socket.on('send_message', async (data) => {
            const { receiverId, message } = data;
            try {
                const msg = await Message.create({
                    senderId: userId,
                    receiverId,
                    message,
                    status: 'sent',
                });

                // Kirim ke penerima jika online
                const receiverSocketId = userSockets.get(receiverId.toString());
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit('receive_message', msg);
                }

                // Kirim kembali ke pengirim untuk konfirmasi
                socket.emit('message_sent_confirmation', msg);

            } catch (error) {
                console.error('Error sending message:', error);
            }
        });

        // Handler untuk typing indicator
        socket.on('typing', (data) => {
            const receiverSocketId = userSockets.get(data.receiverId.toString());
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('user_typing', { senderId: userId });
            }
        });

        socket.on('stop_typing', (data) => {
            const receiverSocketId = userSockets.get(data.receiverId.toString());
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('user_stop_typing', { senderId: userId });
            }
        });

        // Handler pesan dibaca
        socket.on('messages_read', async (data) => {
            const { senderId } = data;
            await Message.update({ status: 'read' }, {
                where: { senderId: senderId, receiverId: userId, status: 'sent' }
            });

            // Beri tahu pengirim bahwa pesannya sudah dibaca
            const senderSocketId = userSockets.get(senderId.toString());
            if(senderSocketId) {
                io.to(senderSocketId).emit('messages_updated_to_read', { receiverId: userId });
            }
        });


        // Handler saat disconnect
        socket.on('disconnect', async () => {
            console.log(`❌ User disconnected: ${userId}`);
            userSockets.delete(userId.toString());
            try {
               await User.update({ status_online: false, last_seen: new Date() }, { where: { id: userId } });
               // Broadcast status offline
               socket.broadcast.emit('user_offline', { userId, last_seen: new Date() });
            } catch (error) {
                console.error('Error updating user status on disconnect:', error);
            }
        });
    });
};

