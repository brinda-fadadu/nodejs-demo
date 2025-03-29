const faker = require('faker')
const { models, expect } = require('../helper')
const { Person } = models

describe('Models/Person', () => {
  describe('SSN', () => {
    let ssn, personData;

    beforeEach(function() {
      ssn = faker.ssn()
      personData = {
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
        ssn: ssn.original
      }
    });

    it('create person without ssn and set salt', async () => {
      const person = await Person.create({
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName()
      })

      expect(person.ssn).to.an('undefined')
      expect(person.ssnLastFour).to.an('undefined')
      expect(person.ssnSalt).to.a('string')
    })

    it('create person with encrypted ssn', async () => {
      const person = await Person.create(personData)
      person.ssn.should.equal(ssn.original)
      person.ssnLastFour.should.equal(ssn.lastFour)
     
      const personWithMaskSSN = await Person.findByPk(person.id)
      personWithMaskSSN.ssn.should.equal(ssn.masked)
      personWithMaskSSN.ssnLastFour.should.equal(ssn.lastFour)

      const personWithFullSSN = await Person.scope('withFullSSN').findByPk(person.id)
      personWithFullSSN.ssn.should.equal(ssn.original)
    })

    it('update person ssn', async () => {
      const person = await Person.create(personData)
      const newSsn = faker.ssn()

      person.ssn = newSsn.original
      await person.save()
      person.ssnLastFour.should.equal(newSsn.lastFour)

      const personWithFullSSN = await Person.scope('withFullSSN').findByPk(person.id)
      personWithFullSSN.ssn.should.equal(newSsn.original)
    })

    it('should not update person ssn when ssn value not set', async () => {
      const person = await Person.create(personData)

      person.firstName = faker.name.firstName()
      person.ssn = null
      await person.save()

      person.ssnLastFour.should.equal(ssn.lastFour)

      const personWithFullSSN = await Person.scope('withFullSSN').findByPk(person.id)
      personWithFullSSN.ssn.should.equal(ssn.original)
    })

    it('should set ssn salt if ssn salt not set for older records', async () => {
      const person = await Person.create({
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName()
      })

      person.setDataValue('ssnSalt', null)
      await person.save()

      const savedPerson = await Person.findByPk(person.id)
      expect(savedPerson.getDataValue('ssnSalt')).to.an('null')

      const ssn = faker.ssn()
      person.ssn = ssn.original 
      await person.save()

      const personWithFullSSN = await Person.scope('withFullSSN').findByPk(person.id)
      personWithFullSSN.ssn.should.equal(ssn.original)

      expect(personWithFullSSN.getDataValue('ssnSalt').length > 0).to.be.true
    })
  })
})
