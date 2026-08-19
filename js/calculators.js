// Calculator Functions

// Position Size Calculator
function calculatePositionSize(accountBalance, riskPercent, entryPrice, stopLoss) {
    if (!accountBalance || !riskPercent || !entryPrice || !stopLoss) {
        return null;
    }
    
    const riskAmount = accountBalance * (riskPercent / 100);
    const priceRisk = Math.abs(entryPrice - stopLoss);
    
    if (priceRisk === 0) {
        return null;
    }
    
    const positionSize = riskAmount / priceRisk;
    
    return {
        riskAmount: riskAmount,
        priceRisk: priceRisk,
        positionSize: positionSize,
        positionValue: positionSize * entryPrice
    };
}

// Risk/Reward Calculator
function calculateRiskReward(entryPrice, stopLoss, takeProfit) {
    if (!entryPrice || !stopLoss || !takeProfit) {
        return null;
    }
    
    const risk = Math.abs(entryPrice - stopLoss);
    const reward = Math.abs(takeProfit - entryPrice);
    
    if (risk === 0) {
        return null;
    }
    
    const rrRatio = reward / risk;
    
    return {
        risk: risk,
        reward: reward,
        rrRatio: rrRatio,
        riskPercent: (risk / entryPrice) * 100,
        rewardPercent: (reward / entryPrice) * 100
    };
}

// Initialize calculator event listeners
function initCalculators() {
    // Position Size Calculator
    const calcPositionBtn = document.getElementById('calculatePositionBtn');
    if (calcPositionBtn) {
        calcPositionBtn.addEventListener('click', () => {
            const balance = parseFloat(document.getElementById('calcBalance').value);
            const riskPercent = parseFloat(document.getElementById('calcRiskPercent').value);
            const entry = parseFloat(document.getElementById('calcEntry').value);
            const stopLoss = parseFloat(document.getElementById('calcStopLoss').value);
            
            const result = calculatePositionSize(balance, riskPercent, entry, stopLoss);
            const resultDiv = document.getElementById('positionResult');
            
            if (result) {
                resultDiv.innerHTML = `
                    <div class="result-item">
                        <span class="result-label">Risk Amount</span>
                        <span class="result-value">${formatCurrency(result.riskAmount)}</span>
                    </div>
                    <div class="result-item">
                        <span class="result-label">Price Risk</span>
                        <span class="result-value">${formatNumber(result.priceRisk, 5)}</span>
                    </div>
                    <div class="result-item">
                        <span class="result-label">Position Size</span>
                        <span class="result-value">${formatNumber(result.positionSize, 2)} units</span>
                    </div>
                    <div class="result-item">
                        <span class="result-label">Position Value</span>
                        <span class="result-value">${formatCurrency(result.positionValue)}</span>
                    </div>
                `;
                resultDiv.classList.add('active');
            } else {
                resultDiv.innerHTML = '<p class="text-danger">Invalid inputs. Please check your values.</p>';
                resultDiv.classList.add('active');
            }
        });
    }
    
    // Risk/Reward Calculator
    const calcRRBtn = document.getElementById('calculateRRBtn');
    if (calcRRBtn) {
        calcRRBtn.addEventListener('click', () => {
            const entry = parseFloat(document.getElementById('rrEntry').value);
            const stopLoss = parseFloat(document.getElementById('rrStopLoss').value);
            const takeProfit = parseFloat(document.getElementById('rrTakeProfit').value);
            
            const result = calculateRiskReward(entry, stopLoss, takeProfit);
            const resultDiv = document.getElementById('rrResult');
            
            if (result) {
                resultDiv.innerHTML = `
                    <div class="result-item">
                        <span class="result-label">Risk</span>
                        <span class="result-value">${formatNumber(result.risk, 5)} (${formatNumber(result.riskPercent, 2)}%)</span>
                    </div>
                    <div class="result-item">
                        <span class="result-label">Reward</span>
                        <span class="result-value">${formatNumber(result.reward, 5)} (${formatNumber(result.rewardPercent, 2)}%)</span>
                    </div>
                    <div class="result-item">
                        <span class="result-label">Risk/Reward Ratio</span>
                        <span class="result-value">1:${formatNumber(result.rrRatio, 2)}</span>
                    </div>
                `;
                resultDiv.classList.add('active');
            } else {
                resultDiv.innerHTML = '<p class="text-danger">Invalid inputs. Please check your values.</p>';
                resultDiv.classList.add('active');
            }
        });
    }
}