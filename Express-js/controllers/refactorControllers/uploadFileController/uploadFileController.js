const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob')

const fs = require('fs')
const logger = require('../../../lib/logger')

class UploadFileController {
    /**
     * This is used to get the Blob name
     * @param {*} originalFileName is the name of file to be uploaded
     * @param {*} folder is the name of a folder to which the file has to be uploaded
     */
    async _getBlobName (originalFileName, folder) {
        const identifier = Math.random().toString().replace(/0\./, '')
        return `${folder}/${identifier}-${originalFileName}`
    }

    /**
     * This is used to upload file into azure blob storage
     * @param {*} file is the data of a file that has to be uploaded
     * @param {*} folder is the name of a folder to which the file has to be uploaded
     */
    async uploadFileWithSignature (file, folder) {
        try {
            const uploadOptions = { bufferSize: 4 * 1024 * 1024, maxBuffers: 20 }
            const account = process.env.AZURE_ACCOUNTNAME
            // const accountKey = process.env.AZURE_ACCOUNTKEY
            const containerName = process.env.AZURE_CONTAINERNAME
            const sasToken = process.env.AZURE_STORAGESASTOKEN
            const orginalFileName = file.originalname.replace(/,/g, '')
            const blobService = new BlobServiceClient(`https://${account}.blob.core.windows.net/?${sasToken}`)
            const blobName = await this._getBlobName(orginalFileName, folder)
            const stream = fs.createReadStream(file.path)

            const ContainerClient = blobService.getContainerClient(containerName)
            const blobClient = ContainerClient.getBlockBlobClient(blobName)

            // set mimetype as determined from browser with file upload control
            // const options = { blobHTTPHeaders: { blobContentType: file.type } }

            // upload file
            try {
                await blobClient.uploadStream(stream, uploadOptions.bufferSize, uploadOptions.maxBuffers,
                    {
                        blobHTTPHeaders: {
                            blobContentType: file.mimetype,
                            blobContentDisposition: `attachment; fileName=${orginalFileName}`
                        }
                    })
                // fs.unlink(file.path, () => { })
                let signedUrl = await this.downloadFileWithSignature(blobName)
                // return blobClient.url
                return {
                    url: signedUrl,
                    folderName: folder,
                    originalFileName: blobName
                }
            } catch (error) {
                console.log(error)
                logger.info(`Upload Error -  ${error}`)
                throw new Error(`Upload Error - ${error}`)
            }
        } catch (error) {
            // some files are not allowed to upload, they are giving 400 bad request error with invaildMetaData , please refer this link https://help.servmask.com/knowledgebase/microsoft-azure-storage-error-codes/
            if (error.statusCode === 400) {
                throw new Error('Cannot process the request because it is malformed or incorrect file')
            }
            throw error
        }
    }

    async downloadFileWithSignature (fileName, imageUrl) {
        try {
            // download file with signature
            var azure = require('azure-storage')
            const account = process.env.AZURE_ACCOUNTNAME
            const accountKey = process.env.AZURE_ACCOUNTKEY
            const containerName = process.env.AZURE_CONTAINERNAME

            var blobServiceb = azure.createBlobService(account, accountKey)
            var startDate = new Date()
            var expiryDate = new Date(startDate)
            expiryDate.setMinutes(startDate.getMinutes() + 60)

            var sharedAccessPolicy = {
                AccessPolicy: {
                    Permissions: azure.BlobUtilities.SharedAccessPermissions.READ,
                    // Start: startDate,
                    Expiry: expiryDate
                }
            }
            var container = containerName
            if (fileName) {
                let tt = blobServiceb.generateSharedAccessSignature(container, fileName, sharedAccessPolicy)
                let url = blobServiceb.getUrl(container, fileName, tt)
                return url
            } else if (imageUrl) {
                let formatedurlArray = imageUrl.split(process.env.AZURE_CONTAINERNAME)
                if (formatedurlArray[1]) {
                    const formatedUrl = formatedurlArray[1].replace('%2F', '/')
                    let filename = formatedUrl.replace(/%20/g, ' ')
                    filename = filename.substring(1)
                    let tt = blobServiceb.generateSharedAccessSignature(container, filename, sharedAccessPolicy)
                    let url = blobServiceb.getUrl(container, filename, tt)
                    return url
                }
            }
        } catch (err) {
            throw err
        }
    }

    // Get File Name From URL
    getFileName (imageUrl) {
        let formatedurlArray = imageUrl.split(process.env.AZURE_CONTAINERNAME)
        if (formatedurlArray[1]) {
            const formatedUrl = formatedurlArray[1].replace('%2F', '/')
            let filename = formatedUrl.replace(/%20/g, ' ')
            let removequeryParams = filename.split('?')
            if (removequeryParams.length) filename = removequeryParams[0]
            let removeAgreementId = filename.split('/')
            if (removeAgreementId.length > 1) filename = removeAgreementId[2]
            let removeTimestamp = filename.split('-')
            if (removeTimestamp.length > 0) filename = removeTimestamp.slice(1).join('-') // handle hyphan (-) in the file name
            return filename
        }
    }

    // old uploadFile method
    // TODO: need to update with above uploadFile method and response in entire application where we called uploadFile API.
    // TODO: below method is for just uploading file to azure. need to use below method for ItemImage API's
    async uploadFile (file, folder) {
        try {
            const uploadOptions = { bufferSize: 4 * 1024 * 1024, maxBuffers: 20 }
            const account = process.env.AZURE_ACCOUNTNAME
            const accountKey = process.env.AZURE_ACCOUNTKEY
            const containerName = process.env.AZURE_CONTAINERNAME

            // Use SharedKeyCredential with storage account and account key
            const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey)

            // Use sharedKeyCredential, tokenCredential or anonymousCredential to create a pipeline
            const blobServiceClient = new BlobServiceClient(
                `https://${account}.blob.core.windows.net`,
                sharedKeyCredential
            )
            const blobName = await this._getBlobName(file.originalname, folder)
            const stream = fs.createReadStream(file.path)

            const containerClient = blobServiceClient.getContainerClient(containerName)
            const blockBlobClient = containerClient.getBlockBlobClient(blobName)

            await blockBlobClient.uploadStream(stream, uploadOptions.bufferSize, uploadOptions.maxBuffers,
                { blobHTTPHeaders: { blobContentType: file.mimetype, blobContentDisposition: `attachment; fileName=${file.originalname}` } })
            fs.unlink(file.path, () => { })
            return blockBlobClient.url
        } catch (error) {
            // some files are not allowed to upload, they are giving 400 bad request error with invaildMetaData , please refer this link https://help.servmask.com/knowledgebase/microsoft-azure-storage-error-codes/
            if (error.statusCode === 400) {
                throw new Error('Cannot process the request because it is malformed or incorrect file')
            }
            throw error
        }
    }
}
module.exports = UploadFileController
