// Scope global agar bisa diakses dari main.js
window.chatSocket = (() => {
    const socket = io();
    const currentUserId = parseInt(document.getElementById('currentUserId').value);

    // =================================================================
    //                 EVENT LISTENERS (MENERIMA DARI SERVER)
    // =================================================================

    socket.on('connect', () => {
        console.log('🔌 Terhubung ke server socket.io!', { id: socket.id });
    });

    socket.on('disconnect', () => {
        console.log('🔌 Terputus dari server socket.io!');
    });

    socket.on('receive_message', (msg) => {
        const isSender = msg.senderId === currentUserId;

        // Hanya render jika chat dengan pengirim sedang terbuka
        // 'currentChattingWith' adalah variabel global dari main.js
        if (msg.senderId === window.currentChattingWith || isSender) {
            window.renderMessage(msg, isSender);
            if (!isSender) {
                // Jika kita penerima, kirim event bahwa pesan sudah dibaca
                emitMessagesRead(msg.senderId);
            }
        } else {
            // TODO: Tampilkan notifikasi atau update unread count di sidebar
            console.log(`Pesan baru dari user ${msg.senderId}`);
        }
    });
    
    socket.on('message_sent_confirmation', (msg) => {
         // UI diupdate dengan pesan yang sudah dikonfirmasi server
         window.renderMessage(msg, true);
    });

    socket.on('user_online', ({ userId }) => {
        console.log(`User ${userId} online`);
        window.updateUserStatusUI(userId, true, null);
    });

    socket.on('user_offline', ({ userId, last_seen }) => {
        console.log(`User ${userId} offline`);
        window.updateUserStatusUI(userId, false, last_seen);
    });

    socket.on('user_typing', ({ senderId }) => {
        if (senderId === window.currentChattingWith) {
            window.showTypingIndicator();
        }
    });

    socket.on('user_stop_typing', ({ senderId }) => {
        if (senderId === window.currentChattingWith) {
            window.hideTypingIndicator();
        }
    });
    
    socket.on('messages_updated_to_read', ({ receiverId }) => {
        // `receiverId` adalah ID lawan bicara yang sudah membaca pesan kita
        window.updateMessagesToReadUI(receiverId);
    });

    // =================================================================
    //              EVENT EMITTERS (MENGIRIM KE SERVER)
    // =================================================================

    const sendMessage = (receiverId, message) => {
        socket.emit('send_message', { receiverId, message });
    };

    const emitTyping = (receiverId) => {
        socket.emit('typing', { receiverId });
    };

    const emitStopTyping = (receiverId) => {
        socket.emit('stop_typing', { receiverId });
    };
    
    const emitMessagesRead = (senderId) => {
        // Memberi tahu server bahwa kita sudah membaca semua pesan dari `senderId`
        socket.emit('messages_read', { senderId });
    };

    // =================================================================
    //                FUNGSI API CALL (NON-SOCKET)
    // =================================================================

    const fetchChatHistory = async (otherUserId) => {
        try {
            const response = await fetch(`/api/chat/${otherUserId}`);
            if (!response.ok) {
                throw new Error('Gagal memuat riwayat chat');
            }
            return await response.json();
        } catch (error) {
            console.error(error);
            return []; // Kembalikan array kosong jika gagal
        }
    };
    
    const searchUsers = async (query) => {
         try {
            const response = await fetch(`/api/users/search?query=${query}`);
             if (!response.ok) throw new Error('Pencarian gagal');
             return await response.json();
        } catch (error) {
            console.error(error);
            return [];
        }
    };


    // Expose fungsi yang bisa dipanggil dari main.js
    return {
        sendMessage,
        emitTyping,
        emitStopTyping,
        emitMessagesRead,
        fetchChatHistory,
        searchUsers
    };
})();
