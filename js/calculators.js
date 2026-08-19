// Calculator Functions

function calculatePositionSize(accountBalance, riskPercent, entryPrice, stopLoss) {
    if (!accountBalance || !riskPercent || !entryPrice || !stopLoss) return null;
    const riskAmount = accountBalance * (riskPercent / 100);
    const priceRisk = Math.abs(entryPrice - stopLoss);
    if (priceRisk === 0) return null;
    const positionSize = riskAmount / priceRisk;
    return { riskAmount, priceRisk, positionSize, positionValue: positionSize * entryPrice };
}

function calculateRiskReward(entryPrice, stopLoss, takeProfit) {
    if (!entryPrice || !stopLoss || !takeProfit) return null;
    const risk = Math.abs(entryPrice - stopLoss);
    const reward = Math.abs(takeProfit - entryPrice);
    if (risk === 0) return null;
    return {
        risk, reward, rrRatio: reward / risk,
        riskPercent: (risk / entryPrice) * 100,
        rewardPercent: (reward / entryPrice) * 100
    };
}

function calculateTradeRisk(accountBalance, entryPrice, stopLoss, positionSize) {
    if (!accountBalance || !entryPrice || !stopLoss || !positionSize) return null;
    const riskAmount = Math.abs(entryPrice - stopLoss) * positionSize;
    const riskPercent = (riskAmount / accountBalance) * 100;
    return { riskAmount, riskPercent };
}

function initCalculators() {
    // Position Size
    const calcPositionBtn = document.getElementById('calculatePositionBtn');
    if (calcPositionBtn) {
        calcPositionBtn.addEventListener('click', () => {
            const result = calculatePositionSize(
                parseFloat(document.getElementById('calcBalance').value),
                parseFloat(document.getElementById('calcRiskPercent').value),
                parseFloat(document.getElementById('calcEntry').value),
                parseFloat(document.getElementById('calcStopLoss').value)
            );
            const resultDiv = document.getElementById('positionResult');
            if (result) {
                resultDiv.innerHTML = `
                    <div class="result-item"><span class="result-label">Risk Amount</span><span class="result-value">${formatCurrency(result.riskAmount)}</span></div>
                    <div class="result-item"><span class="result-label">Price Risk</span><span class="result-value">${formatNumber(result.priceRisk, 5)}</span></div>
                    <div class="result-item"><span class="result-label">Position Size</span><span class="result-value">${formatNumber(result.positionSize, 2)} units</span></div>
                    <div class="result-item"><span class="result-label">Position Value</span><span class="result-value">${formatCurrency(result.positionValue)}</span></div>
                `;
                resultDiv.classList.add('active');
            } else {
                resultDiv.innerHTML = '<p class="text-danger">Invalid inputs. Please check your values.</p>';
                resultDiv.classList.add('active');
            }
        });
    }

    // Risk / Reward
    const calcRRBtn = document.getElementById('calculateRRBtn');
    if (calcRRBtn) {
        calcRRBtn.addEventListener('click', () => {
            const result = calculateRiskReward(
                parseFloat(document.getElementById('rrEntry').value),
                parseFloat(document.getElementById('rrStopLoss').value),
                parseFloat(document.getElementById('rrTakeProfit').value)
            );
            const resultDiv = document.getElementById('rrResult');
            if (result) {
                resultDiv.innerHTML = `
                    <div class="result-item"><span class="result-label">Risk</span><span class="result-value">${formatNumber(result.risk, 5)} (${formatNumber(result.riskPercent, 2)}%)</span></div>
                    <div class="result-item"><span class="result-label">Reward</span><span class="result-value">${formatNumber(result.reward, 5)} (${formatNumber(result.rewardPercent, 2)}%)</span></div>
                    <div class="result-item"><span class="result-label">Risk/Reward Ratio</span><span class="result-value">1:${formatNumber(result.rrRatio, 2)}</span></div>
                `;
                resultDiv.classList.add('active');
            } else {
                resultDiv.innerHTML = '<p class="text-danger">Invalid inputs. Please check your values.</p>';
                resultDiv.classList.add('active');
            }
        });
    }

    // Risk Calculator
    const calcRiskBtn = document.getElementById('calculateRiskBtn');
    if (calcRiskBtn) {
        calcRiskBtn.addEventListener('click', () => {
            const result = calculateTradeRisk(
                parseFloat(document.getElementById('riskBalance').value),
                parseFloat(document.getElementById('riskEntry').value),
                parseFloat(document.getElementById('riskStopLoss').value),
                parseFloat(document.getElementById('riskSize').value)
            );
            const resultDiv = document.getElementById('riskResult');
            if (result) {
                const warning = result.riskPercent > 2
                    ? `<div class="result-item"><span class="result-label">Warning</span><span class="result-value text-danger">Above 2% risk!</span></div>`
                    : `<div class="result-item"><span class="result-label">Status</span><span class="result-value text-success">Within safe risk</span></div>`;
                resultDiv.innerHTML = `
                    <div class="result-item"><span class="result-label">Risk Amount</span><span class="result-value">${formatCurrency(result.riskAmount)}</span></div>
                    <div class="result-item"><span class="result-label">Risk Per Trade</span><span class="result-value">${formatNumber(result.riskPercent, 2)}%</span></div>
                    ${warning}
                `;
                resultDiv.classList.add('active');
            } else {
                resultDiv.innerHTML = '<p class="text-danger">Invalid inputs. Please check your values.</p>';
                resultDiv.classList.add('active');
            }
        });
    }
}
