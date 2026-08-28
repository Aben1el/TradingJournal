// ============ TradeVault Profile ============
(async function () {
    const $ = (id) => document.getElementById(id);
    if (!$('profileForm')) return;

    // wait for Supabase client (max 3s)
    const client = await new Promise((resolve) => {
        if (window.tvClient) return resolve(window.tvClient);
        window.addEventListener('tv-client-ready', () => resolve(window.tvClient), { once: true });
        setTimeout(() => resolve(window.tvClient), 3000);
    });

    if (!client) { location.href = 'auth.html'; return; }
    const { data: sess } = await client.auth.getSession();
    if (!sess.session) { location.href = 'auth.html'; return; }
    const user = sess.session.user;

    let profile = null;

    async function loadProfile() {
        const { data } = await client.from('profiles').select('*').eq('id', user.id).single();
        profile = data;
        render();
    }

    function render() {
        if (!profile) return;
        $('profUsername').textContent = '@' + (profile.username || 'trader');
        $('profName').textContent = profile.full_name || '';
        $('profEmail').textContent = profile.email || user.email || '';
        $('profSince').textContent = profile.created_at
            ? 'Member since ' + new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            : '';
        const img = $('profileAvatar');
        if (profile.avatar_url) {
            img.src = profile.avatar_url; img.style.display = 'block';
            $('avatarPlaceholder').style.display = 'none';
        } else {
            img.style.display = 'none';
            $('avatarPlaceholder').style.display = 'flex';
            $('avatarPlaceholder').textContent = (profile.username || 'T').charAt(0).toUpperCase();
        }
        $('editName').value = profile.full_name || '';
        $('editUsername').value = profile.username || '';
        $('editTimezone').value = profile.timezone || '';
        $('editCurrency').value = profile.preferred_currency || 'USD';
    }

    // ---- trading stats (real data only) ----
    (async () => {
        const trades = await db.getAllTrades();
        const total = trades.length;
        const wins = trades.filter(t => t.profitLoss > 0).length;
        const pl = trades.reduce((s, t) => s + (t.profitLoss || 0), 0);
        const stratCount = {};
        trades.forEach(t => { if (t.strategy) stratCount[t.strategy] = (stratCount[t.strategy] || 0) + 1; });
        const fav = Object.entries(stratCount).sort((a, b) => b[1] - a[1])[0];
        const streak = getCurrentStreak(trades);
        $('profStats').innerHTML = `
            <div class="pstat"><div class="pstat-label">Trades</div><div class="pstat-value">${total}</div></div>
            <div class="pstat"><div class="pstat-label">Win Rate</div><div class="pstat-value ${total ? 'text-success' : ''}">${total ? formatPercentage((wins / total) * 100) : '—'}</div></div>
            <div class="pstat"><div class="pstat-label">Total P&L</div><div class="pstat-value ${pl >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(pl)}</div></div>
            <div class="pstat"><div class="pstat-label">Top Strategy</div><div class="pstat-value" style="font-size:0.95rem;">${fav ? fav[0] : '—'}</div></div>
            <div class="pstat"><div class="pstat-label">Streak</div><div class="pstat-value">${streak.count}${streak.type !== 'none' ? ' ' + streak.type + 's' : ''}</div></div>`;
    })();

    // ---- avatar upload (resize → storage → profile) ----
    function resize(file, size) {
        return new Promise((res, rej) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                const scale = Math.min(1, size / Math.max(img.width, img.height));
                const c = document.createElement('canvas');
                c.width = Math.round(img.width * scale);
                c.height = Math.round(img.height * scale);
                c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
                URL.revokeObjectURL(url);
                c.toBlob(b => res(b), 'image/jpeg', 0.85);
            };
            img.onerror = rej;
            img.src = url;
        });
    }

    $('avatarInput').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        showToast('Uploading photo…');
        try {
            const blob = await resize(file, 512);
            const path = user.id + '/avatar.jpg';
            const { error } = await client.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
            if (error) throw error;
            const url = client.storage.from('avatars').getPublicUrl(path).data.publicUrl + '?v=' + Date.now();
            const { error: e2 } = await client.from('profiles').update({ avatar_url: url }).eq('id', user.id);
            if (e2) throw e2;
            showToast('Profile photo updated!');
            await loadProfile();
        } catch (err) { showToast('Upload failed: ' + err.message, 'error'); }
        e.target.value = '';
    });

    $('avatarRemoveBtn').onclick = async () => {
        try { await client.storage.from('avatars').remove([user.id + '/avatar.jpg']); } catch (e) {}
        await client.from('profiles').update({ avatar_url: null }).eq('id', user.id);
        showToast('Photo removed');
        await loadProfile();
    };

    // ---- save profile ----
    $('profileForm').onsubmit = async (e) => {
        e.preventDefault();
        const btn = $('saveProfileBtn');
        btn.disabled = true; btn.textContent = 'Saving…';
        try {
            const { error } = await client.from('profiles').update({
                full_name: $('editName').value.trim(),
                username: $('editUsername').value.trim() || profile.username,
                timezone: $('editTimezone').value.trim() || 'UTC',
                preferred_currency: $('editCurrency').value.trim().toUpperCase() || 'USD'
            }).eq('id', user.id);
            if (error) throw error;
            const newPw = $('editPassword').value;
            if (newPw) {
                if (newPw.length < 8 || !/\d/.test(newPw)) throw new Error('Password must be 8+ chars with a number');
                const { error: pe } = await client.auth.updateUser({ password: newPw });
                if (pe) throw pe;
            }
            showToast('Profile saved!');
            $('editPassword').value = '';
            await loadProfile();
        } catch (err) { showToast('Save failed: ' + err.message, 'error'); }
        btn.disabled = false; btn.textContent = 'Save Changes';
    };

    // ---- logout ----
    $('logoutBtn').onclick = async () => {
        await client.auth.signOut();
        location.href = 'index.html';
    };

    await loadProfile();
})();
