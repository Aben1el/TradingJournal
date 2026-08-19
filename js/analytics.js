// Analytics Module — every number is computed from real trade data

class Analytics {

    calculateStats(trades) {
        const t = trades || [];
        if (t.length === 0) {
            return {
                totalTrades: 0, winRate: 0, lossRate: 0, netPL: 0, profitFactor: 0,
                averageRR: 0, averageWin: 0, averageLoss: 0, bestTrade: 0, worstTrade: 0,
                expectancy: 0, currentStreak: { type: 'none', count: 0 }, maxDrawdown: 0
            };
        }
        const wins = t.filter(x => x.profitLoss > 0);
        const losses = t.filter(x => x.profitLoss < 0);
        const pls = t.map(x => x.profitLoss || 0);
        return {
            totalTrades: t.length,
            winRate: calculateWinRate(t),
            lossRate: (losses.length / t.length) * 100,
            netPL: calculateSum(t, 'profitLoss'),
            profitFactor: calculateProfitFactor(t),
            averageRR: calculateAverage(t, 'rMultiple'),
            averageWin: wins.length ? calculateSum(wins, 'profitLoss') / wins.length : 0,
            averageLoss: losses.length ? calculateSum(losses, 'profitLoss') / losses.length : 0,
            bestTrade: Math.max(...pls),
            worstTrade: Math.min(...pls),
            expectancy: calculateExpectancy(t),
            currentStreak: getCurrentStreak(t),
            maxDrawdown: calculateMaxDrawdown(t)
        };
    }

    filterTradesByDate(trades, filter) {
        if (filter === 'all') return trades || [];
        const now = new Date();
        let startDate;
        switch (filter) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                startDate = new Date(now); startDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                startDate = new Date(now); startDate.setMonth(now.getMonth() - 1);
                break;
            case 'year':
                startDate = new Date(now); startDate.setFullYear(now.getFullYear() - 1);
                break;
            default:
                return trades || [];
        }
        return (trades || []).filter(t => new Date(t.entryDate) >= startDate);
    }

    getTodayStats(trades) {
        const t = trades || [];
        const todayKey = new Date().toDateString();
        const today = t.filter(x => new Date(x.entryDate).toDateString() === todayKey);
        const totalPL = calculateSum(t, 'profitLoss');
        const starting = parseFloat(localStorage.getItem('tv_starting_balance')) || 10000;
        return {
            todayPL: calculateSum(today, 'profitLoss'),
            todayTrades: today.length,
            totalPL,
            currentBalance: starting + totalPL,
            streak: getCurrentStreak(t)
        };
    }

    getMonthlyDetail(trades, monthKey) {
        const mt = (trades || []).filter(t => getMonthKey(t.entryDate) === monthKey);
        if (mt.length === 0) {
            return { trades: 0, pl: 0, winRate: 0, biggestWin: 0, biggestLoss: 0, bestDay: null, worstDay: null };
        }
        const wins = mt.filter(t => t.profitLoss > 0);
        const losses = mt.filter(t => t.profitLoss < 0);
        const dayMap = {};
        mt.forEach(t => {
            const k = String(t.entryDate).split('T')[0];
            dayMap[k] = (dayMap[k] || 0) + (t.profitLoss || 0);
        });
        const days = Object.entries(dayMap).map(([k, pl]) => ({ k, pl }));
        const best = days.reduce((a, b) => (b.pl > a.pl ? b : a), days[0]);
        const worst = days.reduce((a, b) => (b.pl < a.pl ? b : a), days[0]);
        return {
            trades: mt.length,
            pl: calculateSum(mt, 'profitLoss'),
            winRate: calculateWinRate(mt),
            biggestWin: wins.length ? Math.max(...wins.map(t => t.profitLoss)) : 0,
            biggestLoss: losses.length ? Math.min(...losses.map(t => t.profitLoss)) : 0,
            bestDay: best,
            worstDay: worst
        };
    }

    getEquityCurveData(trades) {
        if (!trades || trades.length === 0) return { labels: [], data: [] };
        const sorted = [...trades].sort((a, b) => new Date(a.entryDate) - new Date(b.entryDate));
        const labels = [], data = [];
        let cumulative = 0;
        for (const trade of sorted) {
            cumulative += trade.profitLoss || 0;
            labels.push(formatDate(trade.entryDate));
            data.push(cumulative);
        }
        return { labels, data };
    }

    getDailyPL(trades) {
        const map = {};
        (trades || []).forEach(t => {
            const k = String(t.entryDate).split('T')[0];
            map[k] = (map[k] || 0) + (t.profitLoss || 0);
        });
        const keys = Object.keys(map).sort().slice(-30);
        return {
            labels: keys.map(k => formatDate(k)),
            data: keys.map(k => map[k]),
            colors: keys.map(k => map[k] >= 0 ? '#10b981' : '#ef4444')
        };
    }

    getWinLossDistribution(trades) {
        const t = trades || [];
        return {
            labels: ['Wins', 'Losses', 'Breakeven'],
            data: [
                t.filter(x => x.profitLoss > 0).length,
                t.filter(x => x.profitLoss < 0).length,
                t.filter(x => x.profitLoss === 0).length
            ],
            colors: ['#10b981', '#ef4444', '#6b7280']
        };
    }

    getPerformanceByStrategy(trades) {
        const stats = this.getStrategyStats(trades);
        const labels = Object.keys(stats);
        return {
            labels,
            data: labels.map(l => stats[l].pl),
            colors: labels.map((_, i) => `hsl(${(i * 137.508) % 360}, 70%, 60%)`)
        };
    }

    getStrategyStats(trades) {
        const groups = {};
        (trades || []).forEach(t => {
            const name = t.strategy || 'No Strategy';
            (groups[name] = groups[name] || []).push(t);
        });
        const out = {};
        Object.keys(groups).forEach(name => {
            const arr = groups[name];
            const wins = arr.filter(x => x.profitLoss > 0);
            const losses = arr.filter(x => x.profitLoss < 0);
            const pls = arr.map(x => x.profitLoss || 0);
            out[name] = {
                trades: arr.length,
                wins: wins.length,
                winRate: calculateWinRate(arr),
                pl: calculateSum(arr, 'profitLoss'),
                avgR: calculateAverage(arr, 'rMultiple'),
                profitFactor: calculateProfitFactor(arr),
                avgWin: wins.length ? calculateSum(wins, 'profitLoss') / wins.length : 0,
                avgLoss: losses.length ? calculateSum(losses, 'profitLoss') / losses.length : 0,
                best: pls.length ? Math.max(...pls) : 0,
                worst: pls.length ? Math.min(...pls) : 0
            };
        });
        return out;
    }

    getProfitByDayOfWeek(trades) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const map = {};
        (trades || []).forEach(t => {
            const d = days[new Date(t.entryDate).getDay()];
            map[d] = (map[d] || 0) + (t.profitLoss || 0);
        });
        const data = days.map(d => map[d] || 0);
        return { labels: days, data, colors: data.map(pl => pl >= 0 ? '#10b981' : '#ef4444') };
    }

    getLongVsShortPerformance(trades) {
        const t = trades || [];
        const longPL = calculateSum(t.filter(x => x.direction === 'long'), 'profitLoss');
        const shortPL = calculateSum(t.filter(x => x.direction === 'short'), 'profitLoss');
        return { labels: ['Long', 'Short'], data: [longPL, shortPL], colors: ['#10b981', '#ef4444'] };
    }

    getMonthlyPerformance(trades) {
        const map = {};
        (trades || []).forEach(t => {
            const k = getMonthKey(t.entryDate);
            map[k] = (map[k] || 0) + (t.profitLoss || 0);
        });
        const keys = Object.keys(map).sort();
        return {
            labels: keys.map(k => formatMonthKey(k)),
            data: keys.map(k => map[k]),
            colors: keys.map(k => map[k] >= 0 ? '#10b981' : '#ef4444')
        };
    }

    getRRDistribution(trades) {
        const ranges = [
            { label: '< 0R', min: -Infinity, max: 0 },
            { label: '0-1R', min: 0, max: 1 },
            { label: '1-2R', min: 1, max: 2 },
            { label: '2-3R', min: 2, max: 3 },
            { label: '3-5R', min: 3, max: 5 },
            { label: '> 5R', min: 5, max: Infinity }
        ];
        const data = ranges.map(r => (trades || []).filter(t => {
            const rM = t.rMultiple || 0;
            return rM >= r.min && rM < r.max;
        }).length);
        return {
            labels: ranges.map(r => r.label),
            data,
            colors: data.map((_, i) => `hsl(${(i * 60) % 360}, 70%, 60%)`)
        };
    }

    getPerformanceBySession(trades) {
        const map = {};
        (trades || []).forEach(t => {
            const s = t.session || 'Unknown';
            if (!map[s]) map[s] = { trades: 0, pl: 0 };
            map[s].trades++;
            map[s].pl += t.profitLoss || 0;
        });
        const labels = Object.keys(map);
        const data = labels.map(l => map[l].pl);
        return {
            labels, data,
            colors: labels.map((_, i) => `hsl(${(i * 137.508) % 360}, 70%, 60%)`)
        };
    }

    getDisciplineBands(trades) {
        const bands = [
            { label: 'Discipline 8–10', min: 8, max: 10 },
            { label: 'Discipline 5–7', min: 5, max: 7 },
            { label: 'Discipline 1–4', min: 1, max: 4 }
        ];
        return bands.map(b => {
            const arr = (trades || []).filter(t => t.discipline >= b.min && t.discipline <= b.max);
            return {
                label: b.label,
                count: arr.length,
                avgPL: arr.length ? calculateSum(arr, 'profitLoss') / arr.length : 0,
                winRate: arr.length ? calculateWinRate(arr) : 0
            };
        });
    }

    // Smart Insights — only patterns supported by real data
    getSmartInsights(trades) {
        const t = trades || [];
        if (t.length < 10) {
            return [{ type: 'neutral', text: '<strong>Not enough trading data yet.</strong> Record at least 10–20 trades to start discovering meaningful patterns.' }];
        }
        const out = [];

        // Best strategy
        const stratList = Object.entries(this.getStrategyStats(t)).filter(([n, s]) => s.trades >= 3 && n !== 'No Strategy');
        if (stratList.length) {
            stratList.sort((a, b) => b[1].pl - a[1].pl);
            const [name, s] = stratList[0];
            if (s.pl > 0) out.push({ type: 'positive', text: `Your best-performing strategy is <strong>${name}</strong> with ${formatCurrency(s.pl)} net P/L across ${s.trades} trades.` });
        }

        // Session performance
        const ses = {};
        t.forEach(x => { if (x.session) (ses[x.session] = ses[x.session] || []).push(x); });
        const sesList = Object.entries(ses).filter(([n, arr]) => arr.length >= 3);
        if (sesList.length >= 2) {
            sesList.sort((a, b) => calculateSum(b[1], 'profitLoss') - calculateSum(a[1], 'profitLoss'));
            const [bn, barr] = sesList[0];
            const [wn, warr] = sesList[sesList.length - 1];
            const bpl = calculateSum(barr, 'profitLoss'), wpl = calculateSum(warr, 'profitLoss');
            if (bpl > wpl) out.push({ type: 'positive', text: `You perform better during the <strong>${bn}</strong> session (${formatCurrency(bpl)} vs ${formatCurrency(wpl)} in ${wn}).` });
        }

        // Long vs short win rate
        const longs = t.filter(x => x.direction === 'long');
        const shorts = t.filter(x => x.direction === 'short');
        if (longs.length >= 3 && shorts.length >= 3) {
            const lw = calculateWinRate(longs), sw = calculateWinRate(shorts);
            if (Math.abs(lw - sw) >= 10) {
                out.push({ type: 'positive', text: `Your win rate is higher on <strong>${lw > sw ? 'long' : 'short'} positions</strong> (${formatPercentage(Math.max(lw, sw))} vs ${formatPercentage(Math.min(lw, sw))}).` });
            }
        }

        // Revenge trading detection
        const sorted = [...t].sort((a, b) => new Date(a.entryDate) - new Date(b.entryDate));
        let consec = 0;
        const revenge = [];
        sorted.forEach(x => {
            if (consec >= 2) revenge.push(x);
            consec = (x.profitLoss < 0) ? consec + 1 : 0;
        });
        if (revenge.length >= 3) {
            out.push({ type: 'negative', text: `You took <strong>${revenge.length} trades after consecutive losses</strong> with a ${formatPercentage(calculateWinRate(revenge))} win rate vs ${formatPercentage(calculateWinRate(t))} overall. Consider pausing after losing streaks.` });
        }

        // Month-over-month
        const curKey = getMonthKey(new Date());
        const cur = this.getMonthlyDetail(t, curKey);
        const prev = this.getMonthlyDetail(t, shiftMonthKey(curKey, -1));
        if (cur.trades >= 3 && prev.trades >= 3) {
            if (cur.pl > prev.pl) out.push({ type: 'positive', text: `Your performance has <strong>improved compared with last month</strong> (${formatCurrency(cur.pl)} vs ${formatCurrency(prev.pl)}).` });
            else out.push({ type: 'negative', text: `This month's P/L (${formatCurrency(cur.pl)}) is <strong>below last month</strong> (${formatCurrency(prev.pl)}). Review what changed.` });
        }

        // Best day of week
        const dayMap = {};
        t.forEach(x => {
            const d = new Date(x.entryDate).toLocaleDateString('en-US', { weekday: 'long' });
            (dayMap[d] = dayMap[d] || []).push(x);
        });
        const dayList = Object.entries(dayMap).filter(([n, a]) => a.length >= 3);
        if (dayList.length >= 2) {
            dayList.sort((a, b) => calculateSum(b[1], 'profitLoss') - calculateSum(a[1], 'profitLoss'));
            const [bd, barr] = dayList[0];
            const bpl = calculateSum(barr, 'profitLoss');
            if (bpl > 0) out.push({ type: 'positive', text: `<strong>${bd}</strong> is your strongest day with ${formatCurrency(bpl)} total P/L.` });
        }

        // Discipline impact
        const hi = t.filter(x => x.discipline >= 8);
        const lo = t.filter(x => x.discipline >= 1 && x.discipline <= 4);
        if (hi.length >= 3 && lo.length >= 3) {
            out.push({ type: 'positive', text: `Trades with <strong>discipline 8–10</strong> average ${formatCurrency(calculateSum(hi, 'profitLoss') / hi.length)}, while discipline 1–4 averages ${formatCurrency(calculateSum(lo, 'profitLoss') / lo.length)}.` });
        }

        return out.slice(0, 5);
    }

    getPsychologyInsights(trades) {
        const t = trades || [];
        const insights = [];
        if (t.length < 5) return ['Add more trades to see psychology insights.'];

        const high = t.filter(x => x.discipline >= 8);
        const low = t.filter(x => x.discipline >= 1 && x.discipline < 5);
        if (high.length > 0 && low.length > 0) {
            const hw = calculateWinRate(high), lw = calculateWinRate(low);
            if (hw > lw + 10) insights.push(`Your win rate is ${formatPercentage(hw)} when discipline is 8+ vs ${formatPercentage(lw)} when below 5.`);
        }

        const conf = t.filter(x => x.confidence >= 8);
        if (conf.length >= 3) {
            const avg = calculateAverage(conf, 'profitLoss');
            if (avg > 0) insights.push(`High confidence trades (8+) average ${formatCurrency(avg)} profit.`);
        }

        const emotionMap = {};
        t.forEach(x => {
            if (x.emotionBefore) {
                if (!emotionMap[x.emotionBefore]) emotionMap[x.emotionBefore] = { trades: [], pl: 0 };
                emotionMap[x.emotionBefore].trades.push(x);
                emotionMap[x.emotionBefore].pl += x.profitLoss || 0;
            }
        });
        const best = Object.entries(emotionMap).sort((a, b) => b[1].pl - a[1].pl)[0];
        if (best && best[1].trades.length >= 3) {
            insights.push(`Your best performing emotion state is "${best[0]}" with ${formatCurrency(best[1].pl)} total P/L.`);
        }

        if (insights.length === 0) insights.push('Continue tracking your trades to unlock more insights.');
        return insights;
    }

    getEmotionStats(trades) {
        const emotions = {};
        (trades || []).forEach(x => {
            if (x.emotionBefore) {
                if (!emotions[x.emotionBefore]) emotions[x.emotionBefore] = { count: 0, pl: 0 };
                emotions[x.emotionBefore].count++;
                emotions[x.emotionBefore].pl += x.profitLoss || 0;
            }
        });
        return Object.entries(emotions).map(([emotion, s]) => ({
            emotion, count: s.count, avgPL: s.pl / s.count, totalPL: s.pl
        }));
    }
}

const analytics = new Analytics();
