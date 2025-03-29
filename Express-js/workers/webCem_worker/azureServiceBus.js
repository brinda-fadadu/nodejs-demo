// code of azure service bus API
const { ServiceBusClient } = require('@azure/service-bus')
const logger = require('../../lib/logger')

async function pushDataToServiceBus (eventName, data) {
    // Define connection string and related Service Bus entity names here
    let queueName
    const connectionString = process.env.SERVICE_BUS_CONNECTION_STRING
    const sbClient = ServiceBusClient.createFromConnectionString(connectionString)
    try {
        try {
            queueName = process.env.SERVICE_BUS_QUEUE_NAME
            const queueClient = sbClient.createQueueClient(queueName)
            const sender = queueClient.createSender()
            const message = {
                body: {
                    event_name: eventName,
                    payload: {
                        ...data
                    }
                },
                label: eventName,
                contentType: 'application/json'
            }
            await sender.send(message)
            await queueClient.close()
        } finally {
            console.log('message sent')
            await sbClient.close()
        }
    } catch (error) {
        console.log('error while sending data to azure-service-bus', error)
        logger.error(error)
    }
}

module.exports = exports = pushDataToServiceBus
