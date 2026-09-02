// ============ TradeVault Account Create Fix ============
(function () {
    const st = document.createElement('style');
    st.textContent = `
        .tv-accfix-overlay {
            position: fixed;
            inset: 0;
            z-index: 900;
            background: rgba(4, 6, 12, .72);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
            animation: tvFade .18s ease;
        }

        .tv-accfix-modal {
            width: min(760px, 96vw);
            max-height: 92vh;
            overflow-y: auto;
            background: rgba(18, 20, 30, .96);
            border: 1px solid rgba(255, 255, 255, .12);
            border-radius: 22px;
            box-shadow: 0 35px 120px rgba(0, 0, 0, .6);
            padding: 1.4rem;
        }

        html[data-theme="light"] .tv-accfix-modal {
            background: rgba(248, 250, 252, .98);
            border-color: rgba(146, 156, 176, .45);
        }

        .tv-accfix-head {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 1rem;
            margin-bottom: 1.2rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid var(--border-color);
        }

        .tv-accfix-head h2 {
            margin: 0;
            font-size: 1.25rem;
            letter-spacing: -0.02em;
        }

        .tv-accfix-head p {
            margin: .25rem 0 0;
            color: var(--text-tertiary);
            font-size: .82rem;
            line-height: 1.5;
        }

        .tv-accfix-close {
            width: 34px;
            height: 34px;
            border-radius: 10px;
            border: 1px solid var(--border-color);
            background: var(--bg-glass);
            color: var(--text-secondary);
            cursor: pointer;
            font-size: 1.1rem;
        }

        .tv-accfix-type {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: .8rem;
            margin-bottom: 1.2rem;
        }

        .tv-accfix-type button {
            padding: 1rem;
            border-radius: 16px;
            border: 1px solid var(--border-color);
            background: rgba(255, 255, 255, .035);
            color: var(--text-secondary);
            cursor: pointer;
            text-align: left;
            transition: all .2s ease;
        }

        .tv-accfix-type button strong {
            display: block;
            color: var(--text-primary);
            font-size: .9rem;
            margin-bottom: .25rem;
        }

        .tv-accfix-type button span {
            font-size: .72rem;
            line-height: 1.45;
            color: var(--text-tertiary);
        }

        .tv-accfix-type button.active {
            border-color: rgba(99, 102, 241, .65);
            background: linear-gradient(135deg, rgba(99, 102, 241, .16), rgba(139, 92, 246, .08));
            box-shadow: 0 10px 30px rgba(99, 102, 241, .14);
        }

        .tv-accfix-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: .9rem;
        }

        .tv-accfix-full {
            grid-column: 1 / -1;
        }

        .tv-accfix-modal .form-group {
            margin-bottom: 0;
        }

        .tv-accfix-modal label {
            display: block;
            font-size: .72rem;
            color: var(--text-secondary);
            margin-bottom: .35rem;
            font-weight: 600;
        }

        .tv-accfix-modal input,
        .tv-accfix-modal select {
            width: 100%;
            min-height: 44px;
            border-radius: 12px;
            border: 1px solid var(--border-color);
            background: rgba(0, 0, 0, .22);
            color: var(--text-primary);
            padding: .75rem .85rem;
            font-family: inherit;
            outline: none;
        }

        html[data-theme="light"] .tv-accfix-modal input,
        html[data-theme="light"] .tv-accfix-modal select {
            background: rgba(20, 22, 40, .045);
        }

        .tv-accfix-funded {
            display: none;
            grid-column: 1 / -1;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: .9rem;
            padding-top: .9rem;
            margin-top: .2rem;
            border-top: 1px solid var(--border-color);
        }

        .tv-accfix-funded.show {
            display: grid;
        }

        .tv-accfix-actions {
            display: flex;
            justify-content: flex-end;
            gap: .7rem;
            margin-top: 1.3rem;
            padding-top: 1rem;
            border-top: 1px solid var(--border-color);
        }

        .tv-accfix-actions .btn {
            min-height: 44px;
            border-radius: 12px;
        }

        @media (max-width: 640px) {
            .tv-accfix-modal {
                padding: 1rem;
                border-radius: 18px;
            }

            .tv-accfix-type,
            .tv-accfix-grid,
            .tv-accfix-funded.show {
                grid-template-columns: 1fr;
            }

            .tv-accfix-actions {
                flex-direction: column-reverse;
            }

            .tv-accfix-actions .btn {
                width: 100%;
            }
        }
    `;
    document.head.appendChild(st);

    function waitClient() {
        return new Promise(resolve => {
            if (window.tvClient) return resolve();
            window.addEventListener('tv-client-ready', resolve, { once: true });
            setTimeout(resolve, 2500);
        });
    }

    function money(v) {
        const n = parseFloat(v);
        return Number.isFinite(n) ? n : null;
    }

    function openAccountCreateModal() {
        if (document.querySelector('.tv-accfix-overlay')) return;

        const ov = document.createElement('div');
        ov.className = 'tv-accfix-overlay';

        ov.innerHTML = `
            <div class="tv-accfix-modal">
                <div class="tv-accfix-head">
                    <div>
                        <h2>Create Trading Account</h2>
                        <p>Add a personal, demo, or funded account. Trades will be stored under the active account.</p>
                    </div>
                    <button class="tv-accfix-close" type="button">×</button>
                </div>

                <form id="tvAccFixForm">
                    <div class="tv-accfix-type">
                        <button type="button" class="active" data-type="personal">
                            <strong>Personal / Demo</strong>
                            <span>Use this for Exness demo, personal live accounts, or manual journaling.</span>
                        </button>
                        <button type="button" data-type="funded">
                            <strong>Funded / Prop Firm</strong>
                            <span>Use this for challenge accounts, funded rules, targets, and drawdown tracking.</span>
                        </button>
                    </div>

                    <input type="hidden" id="af_type" value="personal">

                    <div class="tv-accfix-grid">
                        <div class="form-group tv-accfix-full">
                            <label>Account Name</label>
                            <input id="af_name" required placeholder="Example: Exness Demo, FTMO Phase 1">
                        </div>

                        <div class="form-group">
                            <label>Starting Balance</label>
                            <input id="af_starting_balance" type="number" step="0.01" min="0" placeholder="10000">
                        </div>

                        <div class="form-group">
                            <label>Currency</label>
                            <select id="af_currency">
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                                <option value="GBP">GBP</option>
                            </select>
                        </div>

                        <div class="tv-accfix-funded" id="afFundedFields">
                            <div class="form-group">
                                <label>Prop Firm</label>
                                <input id="af_firm_name" placeholder="FTMO, The5ers, FundingPips...">
                            </div>

                            <div class="form-group">
                                <label>Phase</label>
                                <select id="af_phase">
                                    <option value="Phase 1">Phase 1</option>
                                    <option value="Phase 2">Phase 2</option>
                                    <option value="Funded">Funded</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label>Account Size</label>
                                <input id="af_account_size" type="number" step="0.01" min="0" placeholder="100000">
                            </div>

                            <div class="form-group">
                                <label>Profit Target</label>
                                <input id="af_profit_target" type="number" step="0.01" min="0" placeholder="8000">
                            </div>

                            <div class="form-group">
                                <label>Max Daily Loss</label>
                                <input id="af_max_daily_loss" type="number" step="0.01" min="0" placeholder="5000">
                            </div>

                            <div class="form-group">
                                <label>Max Overall Drawdown</label>
                                <input id="af_max_overall_drawdown" type="number" step="0.01" min="0" placeholder="10000">
                            </div>

                            <div class="form-group tv-accfix-full">
                                <label>Minimum Trading Days</label>
                                <input id="af_min_trading_days" type="number" step="1" min="0" placeholder="5">
                            </div>
                        </div>
                    </div>

                    <div class="tv-accfix-actions">
                        <button type="button" class="btn btn-secondary" id="afCancel">Cancel</button>
                        <button type="submit" class="btn btn-primary">Create Account</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(ov);

        const close = () => ov.remove();

        ov.querySelector('.tv-accfix-close').onclick = close;
        ov.querySelector('#afCancel').onclick = close;
        ov.onclick = e => {
            if (e.target === ov) close();
        };

        ov.querySelectorAll('.tv-accfix-type button').forEach(btn => {
            btn.onclick = () => {
                ov.querySelectorAll('.tv-accfix-type button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const type = btn.dataset.type;
                ov.querySelector('#af_type').value = type;
                ov.querySelector('#afFundedFields').classList.toggle('show', type === 'funded');
            };
        });

        ov.querySelector('#tvAccFixForm').onsubmit = async e => {
            e.preventDefault();

            await waitClient();

            if (!window.tvClient) {
                showToast('Connection not ready. Refresh and try again.', 'error');
                return;
            }

            const sessionResult = await tvClient.auth.getSession();
            const session = sessionResult && sessionResult.data && sessionResult.data.session;

            if (!session) {
                showToast('Please log in again before creating an account.', 'error');
                return;
            }

            const type = ov.querySelector('#af_type').value;
            const name = ov.querySelector('#af_name').value.trim();
            const startingBalance = money(ov.querySelector('#af_starting_balance').value) || 0;
            const currency = ov.querySelector('#af_currency').value || 'USD';

            if (!name) {
                showToast('Please enter an account name.', 'warning');
                return;
            }

            const row = {
                user_id: session.user.id,
                type,
                name,
                currency,
                starting_balance: startingBalance
            };

            if (type === 'funded') {
                Object.assign(row, {
                    firm_name: ov.querySelector('#af_firm_name').value.trim() || null,
                    phase: ov.querySelector('#af_phase').value || 'Phase 1',
                    account_size: money(ov.querySelector('#af_account_size').value),
                    profit_target: money(ov.querySelector('#af_profit_target').value),
                    max_daily_loss: money(ov.querySelector('#af_max_daily_loss').value),
                    max_overall_drawdown: money(ov.querySelector('#af_max_overall_drawdown').value),
                    min_trading_days: money(ov.querySelector('#af_min_trading_days').value)
                });
            }

            const { data, error } = await tvClient
                .from('trading_accounts')
                .insert(row)
                .select()
                .single();

            if (error) {
                console.error(error);
                showToast('Account create failed: ' + error.message, 'error');
                return;
            }

            if (data && data.id) {
                localStorage.setItem('tv_active_account_id', data.id);
            }

            close();
            showToast('Account created ✅');

            if (window.tvAccountsEnsure) window.tvAccountsEnsure();
            if (typeof app !== 'undefined' && app.init) app.init();
        };
    }

    // Intercept broken create-account buttons safely
    document.addEventListener('click', function (e) {
        const target = e.target.closest('button, a, [role="button"]');
        if (!target) return;

        const text = (target.textContent || '').trim().toLowerCase();

        const isAccountCreate =
            text === 'create account' ||
            text.includes('new account') ||
            text.includes('add account') ||
            target.id === 'createAccountBtn' ||
            target.id === 'addAccountBtn' ||
            target.classList.contains('acc-add');

        if (!isAccountCreate) return;

        // Do NOT hijack signup/auth create account buttons
        const authArea = target.closest('#authContainer, #loginForm, #signupForm, .auth-card, .auth-container');
        if (authArea) return;

        e.preventDefault();
        e.stopPropagation();
        openAccountCreateModal();
    }, true);

    window.tvOpenAccountCreate = openAccountCreateModal;
})();
