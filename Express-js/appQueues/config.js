const Config = require('../config/config')[process.env.NODE_ENV || 'development']
module.exports = {
    url: `redis://${Config.redis.host}:${Config.redis.port}`,
    host: Config.redis.host,
    port: Config.redis.port
}
