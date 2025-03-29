const faker = require('faker')

function ssn(){
  const values = [
    faker.random.number({ min: 100, max: 999 }),
    faker.random.number({ min: 10, max: 99 }),
    faker.random.number({ min: 1000, max: 9999 })
  ]

  return {
    original: values.join('-'),
    lastFour: values[2].toString(),
    masked: `XXX-XX-${values[2]}`
  }
}

faker.ssn = ssn

module.exports = {
  ssn
}
