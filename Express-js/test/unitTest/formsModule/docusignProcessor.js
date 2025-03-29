const chai = require('chai')
const expect = chai.expect
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised);
chai.should();

const DocusignProcessor = require('../../../appQueues/docusignProcessor')

describe('Docusign send', async () => {
    it('Should send forms to docusign client', async() => {
        await DocusignProcessor.sendForm({data: {id: 17}})
    return true
    })
})
