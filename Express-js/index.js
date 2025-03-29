
let envPath = '.env'

if (process.env.NODE_ENV) {
    envPath += '.' + process.env.NODE_ENV
}

require('dotenv').config({ path: envPath })
const arenaMiddleware = require('./appQueues/arenaConfig')

let express = require('express')
let app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
const xmlBodyParser = require('body-parser-xml')
const sequelize = require('sequelize')
const path = require('path')
const apiRoute = require('./routes/index')
const elasticSearch = require('./lib/elasticsearch')
const autoArchive = require('./lib/autoArchive')
const winston = require('winston')
// TODO: Remove below line of code once data migration in done
const en = require('./lib/encryptionUtil')
const { generateOnePortalId, generateCallIdentifier } = require('./utils/dbGetFunctions')
const migrateScripts = require('./scripts/data-migration/index')

const webCemHandler = require('./routes/webCem')
const logger = winston.createLogger({
    transports: [new winston.transports.Console()]
})

app.use(bodyParser.json({ limit: '1MB' }))
// For docusign callback
xmlBodyParser(bodyParser)
app.use(bodyParser.xml({
    limit: '1MB',
    xmlParseOptions: {
        explicitArray: false
    }
}))

// TODO: Remove below line of code once data migration in done - Start
app.get('/api/temp/generatesalt', function (req, res) {
    res.send(en.generateSalt())
})
app.post('/api/temp/encrypt', function (req, res) {
    var obj = req.body
    res.send(en.encrypt(obj.e, obj.s, obj.v))
})
app.post('/api/temp/decrypt', function (req, res) {
    var obj = req.body
    res.send(en.decrypt(obj.e, obj.s, obj.v))
})
app.get('/api/temp/opi', async function (req, res) {
    const result = await generateOnePortalId()
    res.send(result)
})
app.get('/api/temp/identifier', function (req, res) {
    const result = generateCallIdentifier()
    res.send(result)
})
app.use('/api/temp/migrate', migrateScripts)
// TODO: Remove below line of code once data migration in done - Stop

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
    allowedHeaders: '*',
    exposedHeaders: '*'
}))

if ([undefined, 'development'].includes(process.env.NODE_ENV)) {
    app.use(function (req, res, next) {
        logger.info(req.url, req.method)
        logger.info(req.headers)
        logger.info(req.body)
        next()
    })
}

app.use('/api/webCem', webCemHandler)

// Health Probe for APP Gateway
app.get('/ping', (req, res) => {
    res.send('pong')
})

app.use('/api/v1', apiRoute)

// Use the rollbar error handler to send exceptions to rollbar.
// app.use(rollbar.errorHandler())

const publicPath = path.resolve(__dirname, './public')
app.use('/', express.static(publicPath))

// global error handling
app.use((error, req, res, next) => {
    if (error instanceof sequelize.ValidationError) {
        res.status(400).json({
            error: error.errors[0].message
        })
    } else {
        let errorObj = {
            error: error.message || error
        }
        if (process.env.NODE_ENV === 'development') {
            errorObj.stack = error.stack
        }
        res.status(500).json(errorObj)
    }
})

app.use('/', arenaMiddleware)

app.get('*', (req, res, next) => {
    res.sendFile(path.resolve(__dirname, './public/index.html'))
})
app.listen(process.env.PORT || 3001, () => {
    console.log('started on port : ', process.env.PORT || 3001)
})

elasticSearch()
autoArchive() // scheduled to run every day at 12am
module.exports = app // for testing
