const docusign = require('docusign-esign')
const fs = require('fs')
const DEFAULTS = {
    jwtLifeSecs: 120 * 60, // 120 mins
    scopes: 'signature impersonation'
}

class AuthToken {
    constructor ({ config, privateKeyPath, jwtLifeSecs, scopes }) {
        this.config = config
        this.privateKey = fs.readFileSync(privateKeyPath)
        this.jwtLifeSecs = jwtLifeSecs || DEFAULTS.jwtLifeSecs
        this.scopes = scopes || DEFAULTS.scopes

        this.apiClient = new docusign.ApiClient()
        this.apiClient.setBasePath(this.config.base_path)
        this.apiClient.setOAuthBasePath(this.config.auth_server)
    }

    isExpired () {
        if (this.expiresAt) {
            return this.expiresAt < Date.now()
        }

        return true
    }

    async getToken () {
        if (this.isExpired()) {
            const result = await this.requestToken()
            this.accessToken = result.body.access_token
            this.expiresAt = (Date.now() + result.body.expires_in)
        }

        return this.accessToken
    }

    async requestToken () {
        const result = await this.apiClient.requestJWTUserToken(
            this.config.client_id,
            this.config.user_id,
            this.scopes,
            this.privateKey,
            this.jwtLifeSecs
        )

        return result
    }
}

module.exports = AuthToken
