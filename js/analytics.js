// Analytics Module

class Analytics {
    constructor() {
        this.charts = {};
    }

    // Calculate all statistics
    calculateStats(trades, filter = 'all') {
        const filteredTrades = this.filterTradesByDate(trades, filter);
        
        if (filteredTrades.length === 0) {
            return {
                totalTrades: 0,
                winRate: 0,
                netPL: 0,
                profitFactor: 0,
                averageRR: 0,
                averageWin: 0,
                averageLoss: 0,
                currentStreak: { type: 'none', count: 0 },
                maxDrawdown: 0
            };
        }

        const wins = filteredTrades.filter(t => t.profitLoss > 0);
        const losses = filteredTrades.filter(t => t.profitLoss < 0);

        return {
            totalTrades: filteredTrades.length,
            winRate: calculateWinRate(filteredTrades),
            netPL: calculateSum(filteredTrades, 'profitLoss'),
            profitFactor: calculateProfitFactor(filteredTrades),
            averageRR: calculateAverage(filteredTrades, 'rMultiple'),
            averageWin: wins.length > 0 ? calculateSum(wins, 'profitLoss') / wins.length : 0,
            averageLoss: losses.length > 0 ? calculateSum(losses, 'profitLoss') / losses.length : 0,
            currentStreak: getCurrentStreak(filteredTrades),
            maxDrawdown: calculateMaxDrawdown(filteredTrades)
        };
    }

    // Filter trades by date range
    filterTradesByDate(trades, filter) {
        if (filter === 'all') return trades;

        const now = new Date();
        let startDate;

        switch (filter) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                startDate = new Date(now);
                startDate.setMonth(now.getMonth() - 1);
                break;
            case 'year':
                startDate = new Date(now);
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            default:
                return trades;
        }

        return trades.filter(t => new Date(t.entryDate) >= startDate);
    }

    // Get equity curve data
    getEquityCurveData(trades) {
        if (!trades || trades.length === 0) {
            return { labels: [], data: [] };
        }

        const sortedTrades = [...trades].sort((a, b) => 
            new Date(a.entryDate) - new Date(b.entryDate)
        );

        const labels = [];
        const data = [];
        let cumulativePL = 0;

        for (const trade of sortedTrades) {
            cumulativePL += trade.profitLoss || 0;
            labels.push(formatDate(trade.entryDate));
            data.push(cumulativePL);
        }

        return { labels, data };
    }

    // Get win/loss distribution
    getWinLossDistribution(trades) {
        const wins = trades.filter(t => t.profitLoss > 0).length;
        const losses = trades.filter(t => t.profitLoss < 0).length;
        const breakeven = trades.filter(t => t.profitLoss === 0).length;

        return {
            labels: ['Wins', 'Losses', 'Breakeven'],
            data: [wins, losses, breakeven],
            colors: ['#10b981', '#ef4444', '#6b7280']
        };
    }

    // Get performance by strategy
    getPerformanceByStrategy(trades) {
        const strategyMap = {};

        for (const trade of trades) {
            const strategy = trade.strategy || 'Unknown';
            if (!strategyMap[strategy]) {
                strategyMap[strategy] = {
                    trades: 0,
                    pl: 0,
                    wins: 0
                };
            }
            strategyMap[strategy].trades++;
            strategyMap[strategy].pl += trade.profitLoss || 0;
            if (trade.profitLoss > 0) strategyMap[strategy].wins++;
        }

        const labels = Object.keys(strategyMap);
        const data = labels.map(s => strategyMap[s].pl);
        const colors = labels.map((_, i) => {
            const hue = (i * 137.508) % 360;
            return `hsl(${hue}, 70%, 60%)`;
        });

        return { labels, data, colors };
    }

    // Get profit by day of week
    getProfitByDayOfWeek(trades) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayMap = {};

        for (const trade of trades) {
            const day = new Date(trade.entryDate).getDay();
            const dayName = days[day];
            if (!dayMap[dayName]) {
                dayMap[dayName] = 0;
            }
            dayMap[dayName] += trade.profitLoss || 0;
        }

        const labels = days;
        const data = labels.map(day => dayMap[day] || 0);
        const colors = data.map(pl => pl >= 0 ? '#10b981' : '#ef4444');

        return { labels, data, colors };
    }

    // Get long vs short performance
    getLongVsShortPerformance(trades) {
        const longs = trades.filter(t => t.direction === 'long');
        const shorts = trades.filter(t => t.direction === 'short');

        const longPL = calculateSum(longs, 'profitLoss');
        const shortPL = calculateSum(shorts, 'profitLoss');

        return {
            labels: ['Long', 'Short'],
            data: [longPL, shortPL],
            colors: ['#10b981', '#ef4444']
        };
    }

    // Get monthly performance
    getMonthlyPerformance(trades) {
        const monthMap = {};

        for (const trade of trades) {
            const date = new Date(trade.entryDate);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthMap[monthKey]) {
                monthMap[monthKey] = 0;
            }
            monthMap[monthKey] += trade.profitLoss || 0;
        }

        const sortedMonths = Object.keys(monthMap).sort();
        const labels = sortedMonths.map(m => {
            const [year, month] = m.split('-');
            const date = new Date(year, month - 1);
            return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        });
        const data = sortedMonths.map(m => monthMap[m]);
        const colors = data.map(pl => pl >= 0 ? '#10b981' : '#ef4444');

        return { labels, data, colors };
    }

    // Get R:R distribution
    getRRDistribution(trades) {
        const ranges = [
            { label: '< 0R', min: -Infinity, max: 0 },
            { label: '0-1R', min: 0, max: 1 },
            { label: '1-2R', min: 1, max: 2 },
            { label: '2-3R', min: 2, max: 3 },
            { label: '3-5R', min: 3, max: 5 },
            { label: '> 5R', min: 5, max: Infinity }
        ];

        const distribution = ranges.map(range => {
            const count = trades.filter(t => {
                const r = t.rMultiple || 0;
                return r >= range.min && r < range.max;
            }).length;
            return count;
        });

        return {
            labels: ranges.map(r => r.label),
            data: distribution,
            colors: distribution.map((_, i) => {
                const hue = (i * 60) % 360;
                return `hsl(${hue}, 70%, 60%)`;
            })
        };
    }

    // Get performance by session
    getPerformanceBySession(trades) {
        const sessionMap = {};

        for (const trade of trades) {
            const session = trade.session || 'Unknown';
            if (!sessionMap[session]) {
                sessionMap[session] = { trades: 0, pl: 0 };
            }
            sessionMap[session].trades++;
            sessionMap[session].pl += trade.profitLoss || 0;
        }

        const labels = Object.keys(sessionMap);
        const data = labels.map(s => sessionMap[s].pl);
        const colors = labels.map((_, i) => {
            const hue = (i * 137.508) % 360;
            return `hsl(${hue}, 70%, 60%)`;
        });

        return { labels, data, colors };
    }

    // Get top performing assets
    getTopAssets(trades, limit = 10) {
        const assetMap = {};

        for (const trade of trades) {
            const asset = trade.symbol || 'Unknown';
            if (!assetMap[asset]) {
                assetMap[asset] = 0;
            }
            assetMap[asset] += trade.profitLoss || 0;
        }

        const sorted = Object.entries(assetMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit);

        return {
            labels: sorted.map(([asset]) => asset),
            data: sorted.map(([, pl]) => pl),
            colors: sorted.map(([, pl]) => pl >= 0 ? '#10b981' : '#ef4444')
        };
    }

    // Get psychology insights
    getPsychologyInsights(trades) {
        const insights = [];

        if (trades.length < 5) {
            return ['Add more trades to see psychology insights.'];
        }

        // Discipline analysis
        const highDiscipline = trades.filter(t => t.discipline >= 8);
        const lowDiscipline = trades.filter(t => t.discipline && t.discipline < 5);

        if (highDiscipline.length > 0 && lowDiscipline.length > 0) {
            const highWinRate = calculateWinRate(highDiscipline);
            const lowWinRate = calculateWinRate(lowDiscipline);

            if (highWinRate > lowWinRate + 10) {
                insights.push(`Your win rate is ${formatPercentage(highWinRate)} when discipline is 8+ vs ${formatPercentage(lowWinRate)} when below 5.`);
            }
        }

        // Confidence analysis
        const highConfidence = trades.filter(t => t.confidence >= 8);
        if (highConfidence.length >= 3) {
            const avgPL = calculateAverage(highConfidence, 'profitLoss');
            if (avgPL > 0) {
                insights.push(`High confidence trades (8+) average ${formatCurrency(avgPL)} profit.`);
            }
        }

        // Emotion analysis
        const emotionMap = {};
        for (const trade of trades) {
            const emotion = trade.emotionBefore;
            if (emotion) {
                if (!emotionMap[emotion]) {
                    emotionMap[emotion] = { trades: [], pl: 0 };
                }
                emotionMap[emotion].trades.push(trade);
                emotionMap[emotion].pl += trade.profitLoss || 0;
            }
        }

        const bestEmotion = Object.entries(emotionMap)
            .sort((a, b) => b[1].pl - a[1].pl)[0];

        if (bestEmotion && bestEmotion[1].trades.length >= 3) {
            insights.push(`Your best performing emotion state is "${bestEmotion[0]}" with ${formatCurrency(bestEmotion[1].pl)} total P/L.`);
        }

        if (insights.length === 0) {
            insights.push('Continue tracking your trades to unlock more insights.');
        }

        return insights;
    }

    // Get emotion statistics
    getEmotionStats(trades) {
        const emotions = {};

        for (const trade of trades) {
            const emotion = trade.emotionBefore;
            if (emotion) {
                if (!emotions[emotion]) {
                    emotions[emotion] = { count: 0, pl: 0 };
                }
                emotions[emotion].count++;
                emotions[emotion].pl += trade.profitLoss || 0;
            }
        }

        return Object.entries(emotions).map(([emotion, stats]) => ({
            emotion,
            count: stats.count,
            avgPL: stats.pl / stats.count,
            totalPL: stats.pl
        }));
    }

    // Destroy all charts
    destroyCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.charts = {};
    }
}

const analytics = new Analytics();