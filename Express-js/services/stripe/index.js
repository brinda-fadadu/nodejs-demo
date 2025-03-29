const config = require('../../config').stripe
const Client = require('./client')

module.exports = {
    stripeClient: new Client({ secretKey: config.secret_key })
}

// FYI:
// dev, refactoring, test env's keys are harms stripe account test keys
// QA env keys are narendra account keys
// remaining all env's keys are anthony's account.
