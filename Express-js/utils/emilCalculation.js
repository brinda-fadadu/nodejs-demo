const moment = require('moment')
// const _ = require('lodash')
function rnd (num) {
    return Math.round(num * 100) / 100
}

/**
 * Returns details of particular installment
 * @param {number} amount financed amount
 * @param {number} installmentsNumber number of installments
 * @param {number} interestRate interest rate per annum
 * @param {number} capitalSum principal sum
 * @param {number} interestSum interest sum
 * @param {number} paymentIndex index of current payment iteration
 */
const getNextInstalment = (
    amount, installmentsNumber, interestRate, capitalSum, interestSum, paymentIndex
) => {
    let capital
    let interest
    let installment
    let irmPow
    const interestRateMonth = interestRate / 1200

    if (interestRate === 0) {
        capital = rnd(amount / installmentsNumber)
        interest = rnd((amount - capitalSum) * interestRateMonth)
        installment = capital + interest
    } else {
        irmPow = Math.pow(1 + interestRateMonth, installmentsNumber)
        installment = rnd(amount * ((interestRateMonth * irmPow) / (irmPow - 1)))
        interest = rnd((amount - capitalSum) * interestRateMonth)
        capital = rnd(installment - interest)
    }

    return {
        balance: rnd(amount - capitalSum - capital), // remaining principal
        interest: interest,
        principal: capital,
        paymentIndex,
        interestSum: interestSum + interest,
        expectedPaymentAmount: rnd(installment)
    }
}

/**
 * Returns emi calculation details based on amount, installmentsNumber and interestRate
 * @param {object} data
 */
function loanDetails (data) {
    const { totalPrincipal: amount, interestRate, installmentsNumber, paymentsPerYear, paymentStartDate, timezone } = data
    /** Checking params */
    if (!amount || amount <= 0 ||
        !installmentsNumber || installmentsNumber <= 0 ||
        interestRate < 0) {
        throw new Error(`wrong parameters: ${amount} ${installmentsNumber} ${interestRate}`)
    }

    const installments = []
    let interestSum = 0
    let capitalSum = 0
    let sum = 0
    let firstInstallmentDate = paymentStartDate ? timezone ? moment(paymentStartDate).tz(timezone) : moment(paymentStartDate) : calculatePaymentDate(undefined, paymentsPerYear)
    let prevPaymentDate

    for (let i = 0; i < installmentsNumber; i++) {
        let expectedPaymentDate
        const inst = getNextInstalment(
            amount, installmentsNumber, interestRate, capitalSum, interestSum, i + 1
        )
        sum += inst.expectedPaymentAmount
        capitalSum += inst.principal
        interestSum += inst.interest

        /** adding lost sum on rounding */
        if (i === installmentsNumber - 1) {
            capitalSum += inst.balance
            sum += inst.balance
            inst.balance = 0
        }

        // Expected payment date
        /* if (agreementFinanceScheduleData.length > 0 && _.get(agreementFinanceScheduleData[i], 'expectedPaymentDate')) {
            expectedPaymentDate = agreementFinanceScheduleData[i].expectedPaymentDate
        } else  */
        if (i === 0) {
            expectedPaymentDate = firstInstallmentDate
        } else {
            expectedPaymentDate = calculatePaymentDate(prevPaymentDate, paymentsPerYear)
        }
        inst.expectedPaymentDate = expectedPaymentDate
        // assigning current installment payment as prevPaymentDate
        // to use it in next iteration
        prevPaymentDate = expectedPaymentDate
        installments.push(inst)
    }
    return {
        installments: installments,
        amount: rnd(amount),
        interestSum: rnd(interestSum),
        principalSum: rnd(capitalSum),
        sum: rnd(sum)
    }
}

function calculateRemainingBalance (expectedBalance, extraPayment) {
    return rnd(expectedBalance - extraPayment)
}

/**
 * Returns date for the current installment calculation
 * @param {object} prevPaymentDate date of previous installment
 * @param {number} paymentsPerYear number of payments in a year
 */
function calculatePaymentDate (prevPaymentDate = undefined, paymentsPerYear = 12) {
    let nextExpectedPaymentDate
    if ((12 % paymentsPerYear === 0) && (paymentsPerYear <= 12)) {
        // add months if paymentsPerYear is divisible by 12
        nextExpectedPaymentDate = moment(prevPaymentDate).add((12 / paymentsPerYear), 'month').format()
    } else {
        // add days if paymentsPerYear is not divisible by 12
        nextExpectedPaymentDate = moment(prevPaymentDate).add((365 / paymentsPerYear), 'days').format()
    }
    return nextExpectedPaymentDate
}

module.exports = {
    loanDetails,
    calculateRemainingBalance
}
