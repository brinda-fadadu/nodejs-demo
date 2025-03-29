const chai = require('chai')
const faker = require('faker')
const { personSchema, agreementSchema, callSchema } = require('../../schema')
const models = require('../../../../models/index')
const AgreementController = require('../../../../controllers/refactorControllers/agreementController/agreementController')
const NotesController = require('../../../../controllers/refactorControllers/notesController/notesController')
const CallController = require('../../../../controllers/refactorControllers/callController/callController')

const VerifiedPersonController  = require('../../../../controllers/refactorControllers/personController/verifiedPersonController')
const PersonController = require('../../../../controllers/refactorControllers/personController/personController')
const expect = chai.expect
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised);
chai.should();

describe('notes controller tests error scenarios', () => {
    it('should throw error when adding a note that does not have agreement', async() => {
        let invalidReqBody = {
            "resourceType": "Agreement",
            "resourceId": faker.random.number({ min: 10000 }),
            "categoryId": 3,
            "content": "Lorem ipsum",
            "level": "Funeral",
            "userId": 1
        }
        await expect(NotesController.createNote(invalidReqBody)).to.be.rejectedWith(Error, 'RESOURCE_NOT_FOUND')
    })

    it('should throw error when getting notes that does not have call or agreement', async()=>{
        await expect(NotesController.getNotes(faker.random.number({ min: 10000 }) ,'Agreement')).to.be.rejectedWith(Error, 'RESOURCE_NOT_FOUND')
    })
})

describe('Agreement Notes', async () => {
    let createdAgreement, createdPerson, createdNote
    before(async () => {
        const person = { ...personSchema() }
        createdPerson = await PersonController.createOrUpdate(person, {}, {})
        const verifiedPersonController = new VerifiedPersonController(createdPerson.id)
        await verifiedPersonController.verifyPerson(createdPerson)
        await verifiedPersonController.createArrangement()
        const saleTypes = await verifiedPersonController.getSaleTypeOnArrangement(agreementType=1, createdPerson.isAlive ? 1: 2 )
        saleTypeIds = saleTypes.map(saleType => saleType.id)
        const agreementObject = {
            ...agreementSchema(createdPerson.isAlive),
            type: 1,
            saleTypeId: faker.random.arrayElement(saleTypeIds)
        }
        createdAgreement = await AgreementController.createOrEditAgreement(createdPerson.id, agreementObject)
    })

    it('should create notes', async ()=>{
        let notesData = {
            content: faker.random.word(),
            categoryId: 3,
            resourceId: createdAgreement.id,
            resourceType: 'Agreement',
            userId: 1
        }
        createdNote = await NotesController.createNote(notesData)
        createdNote.should.be.an('array').of.length.greaterThan(0)
    })

    it('should get list of person notes', async () => {
        let personController = new PersonController(createdPerson.id)
        let res = await personController.getPersonRelatedNotes()
        res.should.be.an('array').of.length.greaterThan(0)
    })

    it('should get list of agreement notes', async () => {
        let res = await NotesController.getNotes(createdAgreement.id, 'Agreement')
        res.should.be.an('array').of.length.greaterThan(0)
    })

    after(async () => {
        await models.Note.destroy({ where: { id: createdNote[0].id } })
        // await models.Agreement.destroy({ where: { id: createdAgreement.id }})
        // await models.Arrangement.destroy({ where: { personId: createdPerson.id }})
        // await models.Person.destroy({ where: { id: createdPerson.id }})
    })
})

describe('Call Notes', async () => {
    let createdCall, createdNoteWithLevel, createdNote
    before(async () => {
        callReqBody = await callSchema(6)
        createdCall = await CallController.createOrUpdate(callReqBody)
    })

    it('should create notes with level', async ()=>{
        let notesData = {
            content: faker.random.word(),
            categoryId: 1,
            resourceId: createdCall.id,
            level: 'reason',
            resourceType: 'Call',
            userId: 1
        }
        createdNoteWithLevel = await NotesController.createNote(notesData)
        createdNoteWithLevel.should.be.an('array').of.length.greaterThan(0)
    })

    it('should create notes without level', async ()=>{
        let notesData = {
            content: faker.random.word(),
            categoryId: 1,
            resourceId: createdCall.id,
            resourceType: 'Call',
            userId: 1
        }
        createdNote = await NotesController.createNote(notesData)
        createdNote.should.be.an('array').of.length.greaterThan(0)
    })

    it('should get list of call notes', async () => {
        let res = await NotesController.getNotes(createdCall.id, 'Call')
        res.should.be.an('array').of.length.greaterThan(0)
    })

    after(async() => {
        let noteLevel = (await models.NoteLevel.findAll({ where: {noteId: createdNoteWithLevel[0].id }}))[0]
        if (noteLevel) await models.NoteLevel.destroy( { where: { id: noteLevel.id} })
        await models.Note.destroy({ where: { id: createdNoteWithLevel[0].id } })
        await models.Note.destroy({ where: { id: createdNote[0].id } })
        // await models.Call.destroy({ where: {
        //     id: createdCall.id
        // }})
    })
})

describe('Person Notes', async () => {
    let createdPerson, createdNote
    before(async () => {
        const person = { ...personSchema() }
        createdPerson = await PersonController.createOrUpdate(person, {}, {})
        const verifiedPersonController = new VerifiedPersonController(createdPerson.id)
        await verifiedPersonController.verifyPerson(createdPerson)
        await verifiedPersonController.createArrangement()
    })

    it('should create notes', async ()=>{
        let notesData = {
            content: faker.random.word(),
            categoryId: 2,
            resourceId: createdPerson.id,
            resourceType: 'Person',
            userId: 1
        }
        createdNote = await NotesController.createNote(notesData)
        createdNote.should.be.an('array').of.length.greaterThan(0)
    })

    it('should get list of person notes', async () => {
        let notesData = {
            content: faker.random.word(),
            categoryId: 2,
            resourceId: createdPerson.id,
            resourceType: 'Person',
            userId: 1
        }
        await NotesController.createNote(notesData)
        let res = await NotesController.getNotes(notesData.resourceId, notesData.resourceType)
        res.should.be.an('array').of.length.greaterThan(0)
    })

    after(async () => {
        await models.Note.destroy({ where: { id: createdNote[0].id } })
    })
})