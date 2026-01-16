const crypto = require('crypto');

// Helper Functions
const validateLuhn = (cardNumber) => {
    if (!cardNumber) return false;
    const cleanNum = cardNumber.replace(/[\s-]/g, '');
    if (!/^\d{13,19}$/.test(cleanNum)) return false;
    let sum = 0;
    let shouldDouble = false;
    for (let i = cleanNum.length - 1; i >= 0; i--) {
        let digit = parseInt(cleanNum.charAt(i));
        if (shouldDouble) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
        shouldDouble = !shouldDouble;
    }
    return (sum % 10) === 0;
};

const getCardNetwork = (cardNumber) => {
    const cleanNum = cardNumber.replace(/[\s-]/g, '');
    if (/^4/.test(cleanNum)) return "visa";
    if (/^5[1-5]/.test(cleanNum)) return "mastercard";
    if (/^3[47]/.test(cleanNum)) return "amex";
    if (/^60|^65|^8[1-9]/.test(cleanNum)) return "rupay";
    return "unknown";
};

const validateVPA = (vpa) => /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/.test(vpa);

const generateId = (prefix) => prefix + crypto.randomBytes(8).toString('hex');

module.exports = {
    validateLuhn,
    getCardNetwork,
    validateVPA,
    generateId
};