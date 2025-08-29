document.addEventListener('DOMContentLoaded', () => {
    // === Elemen DOM ===
    const chatPlaceholder = document.getElementById('chatPlaceholder');
    const chatWindow = document.getElementById('chatWindow');
    const chatHeader = document.querySelector('.chat-header');
    const chatMessages = document.getElementById('chatMessages');
    const messageForm = document.getElementById('messageForm');
    const messageInput = document.getElementById('messageInput');
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    const conversationItems = document.querySelectorAll('.conversation-item');
    const darkModeToggle = document.getElementById('darkModeToggle');

    // === State Aplikasi ===
    let currentChattingWith = null; // Menyimpan ID user yang sedang aktif di chat
    let typingTimeout = null;

    // =================================================================
    //                MANAJEMEN TEMA (DARK MODE)
    // =================================================================

    const applyTheme = (theme) => {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    };

    darkModeToggle.addEventListener('click', () => {
        const isDarkMode = document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    });

    // Terapkan tema yang tersimpan saat memuat halaman
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);


    // =================================================================
    //                  FUNGSI-FUNGSI UTAMA UI
    // =================================================================

    /**
     * Membuka jendela chat dengan user tertentu.
     * @param {object} user - Objek user { id, username, avatar, status_online, about }
     */
    window.openChat = async (user) => {
        currentChattingWith = user.id;

        // Update UI
        chatPlaceholder.classList.add('d-none');
        chatWindow.classList.remove('d-none');
        chatWindow.classList.add('d-flex');
        updateChatHeader(user);

        // Reset input dan hasil pencarian
        searchInput.value = '';
        searchResults.innerHTML = '';
        searchResults.classList.add('d-none');

        // Tampilkan loading skeleton
        renderLoadingSkeleton();

        // Ambil riwayat chat dan tampilkan
        const messages = await window.chatSocket.fetchChatHistory(user.id);
        renderChatHistory(messages);

        // Tandai bahwa pesan sudah dibaca
        window.chatSocket.emitMessagesRead(user.id);
    };

    /**
     * Memperbarui header jendela chat dengan informasi user.
     * @param {object} user - Objek user
     */
    const updateChatHeader = (user) => {
        document.getElementById('chatAvatar').src = user.avatar || '/images/default-avatar.png';
        document.getElementById('chatUsername').textContent = user.username;
        updateUserStatusUI(user.id, user.status_online, user.last_seen);
    };
    
    /**
     * Menggulir otomatis ke pesan terakhir.
     */
    const scrollToBottom = () => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    // =================================================================
    //                 FUNGSI-FUNGSI RENDER HTML
    // =================================================================

    /**
     * Membuat dan menampilkan bubble chat.
     * @param {object} msg - Objek pesan dari server
     * @param {boolean} isSender - True jika pengirim adalah user saat ini
     */
    window.renderMessage = (msg, isSender) => {
        // Hapus typing indicator jika ada
        hideTypingIndicator();

        const messageHour = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const checkmarkClass = msg.status === 'read' ? 'read' : '';

        const messageHTML = `
            <div class="message-bubble ${isSender ? 'sent' : 'received'}">
                <p class="message-text">${msg.message}</p>
                <div class="message-info">
                    <span class="message-time">${messageHour}</span>
                    ${isSender ? `<i class="bi bi-check2-all message-status ${checkmarkClass}" id="status-msg-${msg.id}"></i>` : ''}
                </div>
            </div>
        `;
        chatMessages.innerHTML += messageHTML;
        scrollToBottom();
    };

    /**
     * Menampilkan seluruh riwayat chat.
     * @param {Array} messages - Array objek pesan
     */
    const renderChatHistory = (messages) => {
        const currentUserId = parseInt(document.getElementById('currentUserId').value);
        chatMessages.innerHTML = ''; // Hapus skeleton
        if (messages.length === 0) {
            chatMessages.innerHTML = '<div class="text-center text-muted my-4">Mulai percakapan...</div>';
            return;
        }
        messages.forEach(msg => {
            const isSender = msg.senderId === currentUserId;
            renderMessage(msg, isSender);
        });
    };

    /**
     * Menampilkan efek loading skeleton.
     */
    const renderLoadingSkeleton = () => {
        chatMessages.innerHTML = `
            <div class="message-bubble received skeleton" style="width: 60%;"></div>
            <div class="message-bubble sent skeleton" style="width: 45%;"></div>
            <div class="message-bubble received skeleton" style="width: 70%;"></div>
            <div class="message-bubble sent skeleton" style="width: 55%;"></div>
        `;
    };

    /**
     * Menampilkan hasil pencarian user.
     * @param {Array} users - Array objek user
     */
    const renderSearchResults = (users) => {
        if (users.length === 0) {
            searchResults.innerHTML = '<div class="search-result-item">User tidak ditemukan.</div>';
            return;
        }
        searchResults.innerHTML = users.map(user => `
            <div class="search-result-item d-flex align-items-center" data-user-id='${user.id}' data-user-info='${JSON.stringify(user)}'>
                <img src="${user.avatar || '/images/default-avatar.png'}" class="avatar rounded-circle me-3">
                <div>
                    <h6>${user.username}</h6>
                    <small class="text-muted">${user.about || ''}</small>
                </div>
            </div>
        `).join('');
    };

    // =================================================================
    //                 FUNGSI-FUNGSI STATUS & INDIKATOR
    // =================================================================

    /**
     * Memperbarui UI status online/offline user.
     * @param {number} userId
     * @param {boolean} isOnline
     * @param {Date} lastSeen
     */
    window.updateUserStatusUI = (userId, isOnline, lastSeen) => {
        const statusDot = document.getElementById(`status-${userId}`);
        if (statusDot) {
            statusDot.className = `status-dot ${isOnline ? 'online' : ''}`;
        }
        if (currentChattingWith === userId) {
            const chatStatus = document.getElementById('chatStatus');
            if (isOnline) {
                chatStatus.textContent = 'online';
            } else {
                chatStatus.textContent = lastSeen ? `terakhir dilihat ${new Date(lastSeen).toLocaleString()}` : 'offline';
            }
        }
    };

    /**
     * Menampilkan indikator "sedang mengetik".
     */
    window.showTypingIndicator = () => {
        document.getElementById('typingIndicator').classList.remove('d-none');
        scrollToBottom();
    };

    /**
     * Menghilangkan indikator "sedang mengetik".
     */
    window.hideTypingIndicator = () => {
        document.getElementById('typingIndicator').classList.add('d-none');
    };

    /**
     * Mengubah status centang pesan menjadi "dibaca".
     * @param {number} senderId - ID user yang pesannya kita baca (lawan bicara)
     */
    window.updateMessagesToReadUI = (senderId) => {
        // Ini terjadi saat lawan bicara membaca pesan kita.
        // `senderId` di sini adalah ID kita. receiverId adalah ID mereka.
        // Namun, dari server kita dapat `receiverId` yaitu ID lawan bicara
        if(currentChattingWith === senderId){
            const checkmarks = chatMessages.querySelectorAll('.message-status:not(.read)');
            checkmarks.forEach(c => c.classList.add('read'));
        }
    };


    // =================================================================
    //                       EVENT LISTENERS
    // =================================================================

    // Kirim pesan
    messageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const message = messageInput.value.trim();
        if (message && currentChattingWith) {
            window.chatSocket.sendMessage(currentChattingWith, message);
            messageInput.value = '';
            window.chatSocket.emitStopTyping(currentChattingWith);
        }
    });

    // Indikator typing
    messageInput.addEventListener('input', () => {
        if (currentChattingWith) {
            if (!typingTimeout) {
                window.chatSocket.emitTyping(currentChattingWith);
            }
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                window.chatSocket.emitStopTyping(currentChattingWith);
                typingTimeout = null;
            }, 1500); // Berhenti mengetik setelah 1.5 detik tidak ada input
        }
    });

    // Pencarian user
    searchInput.addEventListener('keyup', async (e) => {
        const query = e.target.value.trim();
        if (query.length > 1) {
            searchResults.classList.remove('d-none');
            const users = await window.chatSocket.searchUsers(query);
            renderSearchResults(users);
        } else {
            searchResults.classList.add('d-none');
            searchResults.innerHTML = '';
        }
    });

    // Klik pada hasil pencarian
    searchResults.addEventListener('click', (e) => {
        const item = e.target.closest('.search-result-item');
        if (item) {
            const userData = JSON.parse(item.dataset.userInfo);
            openChat(userData);
        }
    });

    // Klik pada daftar percakapan di sidebar
    conversationItems.forEach(item => {
        item.addEventListener('click', async () => {
            // Logika untuk mengambil data user lengkap dari server jika perlu
            // Untuk sementara, kita buat objek user sederhana dari data yang ada
            const userId = parseInt(item.dataset.userId);
            const username = item.querySelector('h6').textContent;
            const avatar = item.querySelector('img').src;

            // Di aplikasi nyata, Anda akan fetch user details dari API
            // GET /api/user/:userId
            const user = { id: userId, username, avatar, status_online: item.querySelector('.status-dot').classList.contains('online') };
            
            openChat(user);
        });
    });
});
