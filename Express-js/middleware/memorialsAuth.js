async function memorialsAuth (req, res, next) {
    try {
        req.module = req.module === 'Cemetery' ? 'Memorials' : ''
        next()
    } catch (error) {
        next(error)
    }
}

module.exports = {
    memorialsAuth
}
