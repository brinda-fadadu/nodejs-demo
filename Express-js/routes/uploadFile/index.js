const router = require('express').Router()
const authentication = require('../../middleware/authentication')
const { fileUploadHandler } = require('./uploadFile')
const multer = require('multer')

const upload = multer({ dest: 'uploads/' })

router.use(authentication)
router.post('/', upload.single('file'), fileUploadHandler)

module.exports = router
