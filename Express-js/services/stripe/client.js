const stripe = require('stripe')

class Client {
    constructor ({ secretKey }) {
        this.stripe = stripe(secretKey)
    }

    async createCustomer (person, address = {}) {
        const customer = await this.stripe.customers.create(
            this.buildCustomer(person, address)
        )
        return customer
    }

    async updateCustomer (person, address = {}) {
        const customerObj = await this.buildCustomer(person, address)
        const customer = await this.stripe.customers.update(person.stripeCustomerId,
            customerObj
        )
        return customer
    }

    async getCustomer (id) {
        return this.stripe.customers.retrieve(id)
    }

    async createCard (customerId, token) {
        const card = await this.stripe.customers.createSource(customerId, {
            source: token
        })

        return card
    }

    async removeCard (customerId, cardId) {
        const card = await this.stripe.customers.deleteSource(customerId, cardId)
        return card
    }

    async customerCards (customerId) {
        const cards = await this.stripe.customers.listSources(customerId)
        return cards.data
    }

    async createCharge (customerId, cardId, amount, metaData, description, statementDescriptor) {
        try {
            let amountInCents = await this.formatDollarsToCents(amount) // Math.trunc(amount * 100)
            return this.stripe.charges.create({
                amount: amountInCents, // Convert into cents
                currency: 'usd',
                customer: customerId,
                source: cardId,
                metadata: metaData,
                description,
                statement_descriptor: statementDescriptor
            })
        } catch (err) {
            throw err
        }
    }
    async formatDollarsToCents (value) {
        value = (value + '').replace(/[^\d.-]/g, '')
        if (value && value.includes('.')) {
            value = value.substring(0, value.indexOf('.') + 3)
        }
        return value ? Math.round(parseFloat(value) * 100) : 0.00
    }
    async sendPaymentRequestEmail (customerId, amount, description, statementDescriptor, metadata = {}) {
        try {
            const amountInCents = await this.formatDollarsToCents(amount)
            await this.stripe.invoiceItems.create({
                amount: amountInCents, // parseInt(amount * 100),
                currency: 'usd',
                customer: customerId,
                description: description,
                metadata: metadata
            })
            const invoice = await this.stripe.invoices.create({
                customer: customerId,
                collection_method: 'send_invoice',
                days_until_due: 30,
                metadata: metadata,
                description: description,
                statement_descriptor: statementDescriptor
            })
            await this.stripe.invoices.finalizeInvoice(invoice.id)
            const result = await this.stripe.invoices.sendInvoice(invoice.id)
            return result
        } catch (err) {
            throw err
        }
    }

    buildCustomer (person, address) {
        let name = person.name

        if (person.firstName) {
            name = [person.firstName, person.middleName, person.lastName].filter(v => v).join(' ')
        }

        const customer = {
            email: person.email,
            name: name,
            phone: person.phone,
            metadata: { person_id: person.id }
        }

        if (address) {
            customer.address = {
                line1: address.line1,
                line2: address.line2,
                city: address.city,
                state: address.state,
                country: address.country,
                postal_code: address.zipcode
            }
        }

        return customer
    }

    async retrieveCard (customerId, cardId) {
        const card = await this.stripe.customers.retrieveSource(customerId, cardId)
        return card
    }
    // fetch only given chargeid details
    async retrieveCharge (chargeid) {
        const charge = await this.stripe.charges.retrieve(chargeid)
        return charge
    }

    // fetch all the charges available in given stripe account based on selected env.
    async listAllCharges () {
        const charges = await this.stripe.charges.list({
            limit: 10
            // ,
            // starting_after: 'ch_1IobrwId3XBXXz6Ye0ftFtyH' // first time no need to add this param. if we get 10 records first, for second api call need to pass last charge id as start_after parameter
        })
        return charges
    }

    // fetch invoice
    async retrieveInvoice (invoiceId) {
        let invoice = await this.stripe.invoices.retrieve(invoiceId)
        if (invoice && invoice.charge) {
            invoice.chargeDetails = await this.retrieveCharge(invoice.charge)
        }
        return invoice
    }

    async retrieveWebHookRequestBodyByEventId (eventId) {
        const card = await this.stripe.events.retrieve(eventId)
        return card
    }
}

module.exports = Client
