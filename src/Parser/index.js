'use strict'

/**
 * indicative
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const haye = require('haye')
const arrayExpressionRegex = /(\w[^.*]+)(\.\*\.?)(.+)?/
const _ = require('lodash')

let Parser = exports = module.exports = {}

/**
 * parse a given set of validations to a consumable array.
 *
 * @param  {String|Array} rule
 *
 * @return {Array}
 */
Parser.parse = function (validations) {
  if (validations instanceof Array) {
    return validations.map((rule) => rule)
  }

  /**
   * Add .map to be backward compatible, since we want
   * rules to always expected an array of string,
   * null or array.
   *
   * Can be changed later
   */
  return haye.fromPipe(validations).toArray().map((i) => {
    return {
      name: i.name,
      args: i.args === null ? [] : (i.args instanceof Array === true ? i.args : [i.args])
    }
  })
}

/**
 * parses an array expression to a consumable object
 *
 * @param  {String} field
 * @return {Object|Null}
 *
 * @public
 */
Parser.expressionCurryFor = function (field, whenMatched, otherwise) {
  const expression = field.match(arrayExpressionRegex)
  if (_.size(expression) < 4) {
    return otherwise()
  }
  return whenMatched(expression[1], expression[3])
}

/**
 * parses a rule and returns an object with
 * field name and parsed rule.
 *
 * @param   {String} rule
 * @param   {String} field
 *
 * @return  {Object}
 *
 * @private
 */
Parser.parseFieldRule = function (rule, field) {
  return {[field]: Parser.parse(rule)}
}

/**
 * parses field rules for a array expressions
 *
 * @param   {Object} data
 * @param   {String} rule
 * @param   {String} node
 * @param   {String} [child]
 *
 * @return  {Object}
 *
 * @private
 */
Parser.getRulesForExpression = function (data, rule, node, child) {
  return _.fromPairs(_.map(data[node], (value, index) => {
    const fieldName = _([node, index, child]).takeWhile((value) => value !== undefined).join('.')
    return [fieldName, Parser.parse(rule)]
  }))
}

/**
 * transforms a single rule or an array expression
 * into multiple rules
 *
 * @param   {Object} data
 * @param   {String} rule
 * @param   {String} field
 *
 * @return  {Object}
 *
 * @private
 */
Parser.transformRule = function (data, rule, field) {
  return Parser.expressionCurryFor(
    field,
    (dataKey, fieldKey) => Parser.getRulesForExpression(data, rule, dataKey, fieldKey),
    () => Parser.parseFieldRule(rule, field)
  )
}

/**
 * transform rules by parsing each rule and converting
 * array expressions into multiple rules
 *
 * @param   {Object} data
 * @param   {Object} rules
 *
 * @return  {Object}
 *
 * @private
 */
Parser.transformRules = function (data, rules) {
  return _(rules)
  .transform((result, rule, field) => {
    _.extend(result, Parser.transformRule(data, rule, field))
    return result
  }, {})
  .value()
}
