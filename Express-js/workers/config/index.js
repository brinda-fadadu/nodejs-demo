const Config = require('../../config/config')[process.env.NODE_ENV || 'development']
const redisUrl = Config.redis || process.env.REDIS_URL
//  || 'redis://127.0.0.1:6379'
module.exports.redisUrl = { redis: {
    ...redisUrl
} }
