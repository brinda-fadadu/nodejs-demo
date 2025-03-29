const crypto = require('crypto')
const IV_LENGTH = 16
const ALOGORITHAM = 'aes-256-cbc'

function generateSalt () {
    return crypto.randomBytes(16).toString('hex')
}

function encrypt (encryptionKey, salt, value) {
    const key = crypto.scryptSync(encryptionKey, salt, 32)
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALOGORITHAM, key, iv)
    let encrypted = cipher.update(value, 'utf8', 'hex')

    encrypted += cipher.final('hex')
    return iv.toString('hex') + '.' + encrypted
}

function decrypt (encryptionKey, salt, value) {
    const [ivHex, encrypted] = value.split('.')
    const iv = Buffer.from(ivHex, 'hex')
    const key = crypto.scryptSync(encryptionKey, salt, 32)
    const decipher = crypto.createDecipheriv(ALOGORITHAM, key, iv)
    decipher.setAutoPadding(false)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
}

module.exports = {
    encrypt,
    decrypt,
    generateSalt
}
