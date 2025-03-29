const env = process.env.NODE_ENV || 'development'
const configs = {}

const configHandler = {
    get (_target, name) {
        if (!configs[name]) {
            configs[name] = require(`./${name}-config`)[env]
        }

        return configs[name]
    }
}

module.exports = new Proxy({}, configHandler)
