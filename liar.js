import _ from 'highland'
import duplex from './object-duplex'
import deepMatches from 'mout/object/deepMatches'
import assert from 'assert'
import fi from './fi'


export default () => {
  let receivedValues = []
  let buffer = []
  let whens = []

  let api = duplex(
    (x, done) => {
      receivedValues.push(x)
      whens
        .filter(when => deepMatches(x, when.pattern))
        .forEach(when => api.push(pattern.value))
      done()
    },
    (push) => {

    }
  )


  api.whenReceived = (pattern, value) =>
    whens.push({ pattern, value })

  api.assertReceived = (pattern, done) =>
    setTimeout(() =>
      fi(
        receivedValues.filter(val => deepMatches(val, pattern)).length === 0,
        () => {
          throw new assert.AssertionError({
            message:
              'liar never received a value matching the specified pattern:\n' + JSON.stringify(pattern, null, 2) +
              '\n\nActual received values:\n' +
              receivedValues
                .map(x => JSON.stringify(x, null, 2))
                .join('\n') +
              '\n'
            ,
            expected: pattern
          })
        },
        done
      )
    , 0)
  return api
}
