const response = require('../lib/custom-response')

/**
 *
 * @param {*} Function
 * @param {*} String
 */
module.exports = function (validator, part) {
    return function (req, res, next) {
        const { error, result } = validator(req[part])
        if (error) {
            console.log('Came to errro')
            console.log(error)
            response(400, error, res)
        } else {
            console.log(result)
            next()
        }
    }
}
