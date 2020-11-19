'use strict'

const express = require('express')
const _ = require('lodash')
const uuid = require('uuid/v4')
const dynamodb = require('serverless-dynamodb-client')
const utils = require('../lib/utils')
const moment = require('moment')
const router = express.Router()

const GAMES_TABLE = process.env.GAMES_TABLE
const GAME_PATH_PREFIX = process.env.GAME_PATH_PREFIX

const BAD_REQUEST = 400

//
// games
//

// get all games
router.get('/', (req, res) => {
    const params = {
        TableName: GAMES_TABLE
    }

    // TODO: add caching
    dynamodb.doc.scan(params, (error, data) => {
        if (error) {
            console.error('There was an error getting the games', error)
            res.status(BAD_REQUEST).json({
                error: 'There was an error getting the games'
            })
            return
        }

        const gamesData = _.get(data, 'Items')
        if (gamesData.length > 0) {
            const fixAttr = ['awayPlayer', 'awayTeam', 'homePlayer', 'homeTeam']
            const games = utils.attrsToObject(fixAttr, gamesData)
            const out = {
                count: games.length,
                games: games,
            }
            res.json(out)
        } else {
            res.json({message: 'There are no games.'})
        }
    })
})

// add a game
router.post('/', utils.formHandler, async(req, res) => {
    const postData = req.postData

    if (!postData) {
        res.status(BAD_REQUEST).json({
            error: 'Data required'
        })
        return
    }

    // validate players and teams
    const validateAttr = {
        awayPlayer: 'player',
        awayTeam:   'team',
        homePlayer: 'player',
        homeTeam:   'team',
    }

    const validateAttrPromises = []
    _.forOwn(validateAttr, (value, key) => {
        validateAttrPromises.push(utils.validateObjectAttributes(_.get(postData, key), value))
    })

    await Promise.all(validateAttrPromises).then(values => {
        const keys = Object.keys(validateAttr)
        for(let i = 0; i < values.length; i++) {
            const item = _.get(values, `${i}.Item.id`)
            const key = keys[i]
            if (!item) {
                console.error(`This is not a valid ${key}`)
                res.status(BAD_REQUEST).json({
                    error:   'There was an error adding this game',
                    message: `The '${key}' set is invalid. Please try again with a valid '${key}'.`,
                })
                return
            }
        }
        // required: home player, away player, home team, away team, score
        const gameId =  _.get(postData, 'id', uuid())
        const data = {
            awayPlayer:    JSON.stringify(_.get(postData, 'awayPlayer')), // expects a player object
            awayTeam:      JSON.stringify(_.get(postData, 'awayTeam')),
            awayTeamPK:    _.get(postData, 'awayTeamPK'),
            awayTeamScore: _.get(postData, 'awayTeamScore'),
            created_at:    moment().format(),
            homePlayer:    JSON.stringify(_.get(postData, 'homePlayer')), // expects a player object
            homeTeam:      JSON.stringify(_.get(postData, 'homeTeam')),
            homeTeamPK:    _.get(postData, 'homeTeamPK'),
            homeTeamScore: _.get(postData, 'homeTeamScore'),
            id:            gameId,
        }

        // check for missing keys
        const missingKeys = utils.checkObjectValues(data)
        if (missingKeys.length > 0) {
            res.status(BAD_REQUEST).json({
                error: `Missing fields data: ${_.join(missingKeys, ', ')}`
            })
            return
        }

        const params = {
            Item:      data,
            TableName: GAMES_TABLE,
        }

        dynamodb.doc.put(params, error => {
            if (error) {
                console.error('There was an error adding this game', error)
                res.status(BAD_REQUEST).json({
                    error: 'There was an error adding this game',
                    // message: error.message
                })
                return
            }

            res.json({
                message: 'Successfully added game',
                path:    `${GAME_PATH_PREFIX}/${gameId}`
            })
            return
        })
    }).catch(error => {
        console.error('There was an error when validating the attributes for this game submission', error)
        res.status(BAD_REQUEST).json({
            error:   'There was an error adding this game',
            message: error.message
        })
        return
    })
})

// get a game by id
router.get('/:id', (req, res) => {
    const gameId = _.get(req.params, 'id')
    const params = {
        Key: {
            id: gameId,
        },
        TableName: GAMES_TABLE,
    }

    dynamodb.doc.get(params, (error, data) => {
        if (error) {
            console.error(`There was an error getting game ${gameId}`, error)
            res.status(BAD_REQUEST).json({
                error:   `There was an error getting game ${gameId}`,
                message: error.message
            })
        }

        const gamesData = _.get(data, 'Item')
        if (_.has(gamesData, 'id')) {
            const fixAttr = ['awayPlayer', 'awayTeam', 'homePlayer', 'homeTeam']
            const out = {
                game: utils.attrsToObject(fixAttr, gamesData),
            }
            res.json(out)
        } else {
            res.json({message: 'This game does not exist.'})
        }
    })
})

// remove a game by id
router.delete('/:id', (req, res) => {
    const gameId = _.get(req.params, 'id')

    const params = {
        SQL: `SELECT id FROM users WHERE username=${uname} AND password=${passwd}`,
        Key: {
            id: gameId,
        },
        TableName: GAMES_TABLE,
    }

    dynamodb.doc.delete(params, error => {
        if (error) {
            console.error(`There was an error deleting game ${gameId}`, error)
            res.status(BAD_REQUEST).json({
                error:   `There was an error deleting game ${gameId}`,
                message: error.message
            })
        }

        res.json({
            message: 'Successfully deleted game'
        })
    })
})

module.exports = router
