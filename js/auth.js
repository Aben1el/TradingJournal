// ============ TradeVault Auth (Supabase) ============
// tvClient is created in js/config.js

(function authPageInit() {
    const $ = (id) => document.getElementById(id);
    if (!$('loginForm')) return;

    if (!tvClient) $('configWarning').style.display = 'block';

    const showTab = (which) => {
        $('tabLogin').classList.toggle('active', which === 'login');
        $('tabSignup').classList.toggle('active', which === 'signup');
        $('loginForm').style.display = which === 'login' ? 'flex' : 'none';
        $('signupForm').style.display = which === 'signup' ? 'flex' : 'none';
        hideAlerts();
    };
    $('tabLogin').onclick = () => showTab('login');
    $('tabSignup').onclick = () => showTab('signup');

    document.querySelectorAll('.pw-toggle').forEach(btn => {
        btn.onclick = () => {
            const input = $(btn.dataset.target);
            input.type = input.type === 'password' ? 'text' : 'password';
        };
    });

    function showError(msg) { const el = $('authError'); el.textContent = msg; el.style.display = 'block'; $('authSuccess').style.display = 'none'; }
    function showSuccess(msg) { const el = $('authSuccess'); el.textContent = msg; el.style.display = 'block'; $('authError').style.display = 'none'; }
    function hideAlerts() { $('authError').style.display = 'none'; $('authSuccess').style.display = 'none'; }

    const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    const pwOk = (v) => v.length >= 8 && /\d/.test(v);

    function setLoading(btn, on) {
        btn.disabled = on;
        btn.dataset.label = btn.dataset.label || btn.textContent;
        btn.textContent = on ? 'Please wait…' : btn.dataset.label;
    }

    if (tvClient) {
        tvClient.auth.getSession().then(({ data }) => {
            if (data.session) location.href = 'index.html';
        });
    }

    $('loginForm').onsubmit = async (e) => {
        e.preventDefault();
        hideAlerts();
        if (!tvClient) return showError('Configure Supabase in js/config.js first.');
        const email = $('loginEmail').value.trim();
        const password = $('loginPassword').value;
        if (!emailOk(email)) return showError('Enter a valid email address.');
        if (!password) return showError('Enter your password.');

        setLoading($('loginBtn'), true);
        const { error } = await tvClient.auth.signInWithPassword({ email, password });
        setLoading($('loginBtn'), false);
        if (error) return showError(error.message.includes('Invalid') ? 'Incorrect email or password.' : error.message);

        if (!$('rememberMe').checked) sessionStorage.setItem('tv_no_remember', '1');
        location.href = 'index.html';
    };

    $('signupForm').onsubmit = async (e) => {
        e.preventDefault();
        hideAlerts();
        if (!tvClient) return showError('Configure Supabase in js/config.js first.');
        const fullName = $('suName').value.trim();
        const username = $('suUsername').value.trim();
        const email = $('suEmail').value.trim();
        const password = $('suPassword').value;
        const confirm = $('suConfirm').value;

        if (fullName.length < 2) return showError('Please enter your full name.');
        if (username.length < 3) return showError('Username must be at least 3 characters.');
        if (!emailOk(email)) return showError('Enter a valid email address.');
        if (!pwOk(password)) return showError('Password must be 8+ characters and include a number.');
        if (password !== confirm) return showError('Passwords do not match.');

        setLoading($('signupBtn'), true);
        const { data, error } = await tvClient.auth.signUp({
            email, password,
            options: { data: { username, full_name: fullName } }
        });
        setLoading($('signupBtn'), false);
        if (error) return showError(error.message);

        if (data.session) {
            location.href = 'index.html';
        } else {
            showSuccess('Account created! Check your email to confirm, then log in.');
            showTab('login');
        }
    };

    $('forgotBtn').onclick = async () => {
        hideAlerts();
        if (!tvClient) return showError('Configure Supabase in js/config.js first.');
        const email = $('loginEmail').value.trim();
        if (!emailOk(email)) return showError('Type your email in the field first, then tap "Forgot password?".');
        const { error } = await tvClient.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/auth.html' });
        if (error) return showError(error.message);
        showSuccess('Password reset email sent. Check your inbox.');
    };
})();
