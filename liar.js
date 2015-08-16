import _ from 'highland'
import duplex from './object-duplex'
import deepMatches from 'mout/object/deepMatches'
import assert from 'assert'
import fi from './fi'
import isObject from 'mout/lang/isObject'
import isRegExp from 'mout/lang/isRegExp'
import partial from 'mout/function/partial'

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
    (push) => {}
  )


  api.whenReceived = (pattern, value) =>
    whens.push({ pattern, value })

  api.assertReceivedTimes = (times, pattern, done) =>
    setTimeout(() =>
      fi(
        receivedValues.filter(val => deepMatches(val, pattern)).length !== times,
        () => {
          throw new assert.AssertionError({
            message:
              'liar did not receive value matching the specified pattern the expected number of times ('+times+'):\n' + JSON.stringify(pattern, null, 2) +
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

  api.assertReceived = partial(api.assertReceivedTimes, 1)

  api.assertNotReceived = (pattern, done) =>
    setTimeout(() =>
      fi(
        receivedValues.filter(receivedValue =>
          fi(
            isRegExp(pattern),
            () => pattern.test(
              fi(
                isObject(receivedValue),
                () => JSON.stringify(receivedValue),
                () => receivedValue.toString()
              )
            ),
            () => deepMatches(receivedValue, pattern)
          )
        ).length > 0,
        () => {
          throw new assert.AssertionError({
            message:
              'liar received a value matching the specified pattern:\n' +
              (isRegExp(pattern) ?
                pattern.toString() :
                JSON.stringify(pattern, null, 2)) +
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
    , 500)

  api.debug = (name = 'debug') =>
    setTimeout(() => {
      console.log('Debug of liar "' + name + '"')
      receivedValues.forEach(x => console.log(JSON.stringify(x, null, 2)))
    }, 500)
  return api
}
