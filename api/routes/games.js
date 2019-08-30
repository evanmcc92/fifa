'use strict';

const serverless = require('serverless-http');
const express = require('express');
const _ = require('lodash');
const uuid = require('uuid/v4');
const dynamodb = require('serverless-dynamodb-client');
const utils = require('../lib/utils');
const moment = require('moment');
const router = express.Router();

const GAMES_TABLE = process.env.GAMES_TABLE;
const GAME_PATH_PREFIX = process.env.GAME_PATH_PREFIX;

// 
// games
// 

// get all games
router.get('/', function(req, res, next){
    let params = {
        TableName: GAMES_TABLE
    };

    // TODO: add caching
    dynamodb.doc.scan(params, function(error, data) {
        if (error) {
            console.error('There was an error getting the games', error);
            res.status(400).json({
                error: 'There was an error getting the games'
            });
            return;
        }

        let gamesData = _.get(data, 'Items');
        if (gamesData.length > 0) {
            let fixAttr = ['awayPlayer', 'awayTeam', 'homePlayer', 'homeTeam'];
            let games = utils.attrsToObject(fixAttr, gamesData);
            let out = {
                count: games.length,
                games: games,
            }
            res.json(out);
        } else {
            res.json({message: "There are no games."})
        }
    });
});

// add a game
router.post('/', utils.formHandler, async function(req, res, next){
    let postData = req.postData;

    if (!postData) {
        res.status(400).json({
            error: 'Data required'
        });
        return;
    }

    // validate players and teams
    let validateAttr = {
        'awayPlayer': 'player',
        'awayTeam': 'team',
        'homePlayer': 'player',
        'homeTeam': 'team',
    };

    let validateAttrPromises = [];
    _.forOwn(validateAttr, function(value, key) {
        validateAttrPromises.push(utils.validateObjectAttributes(_.get(postData, key), value))
    });

    await Promise.all(validateAttrPromises).then(function(values){
        let keys = Object.keys(validateAttr);
        for (var i = 0; i < values.length; i++) {
            if (!_.get(values[i], 'Item.id')) {
                console.error(`This is not a valid ${keys[i]}`);
                res.status(400).json({
                    error: 'There was an error adding this game',
                    message: `The '${keys[i]}' set is invalid. Please try again with a valid '${keys[i]}'.`,
                });
                return;
            }
        }
        // required: home player, away player, home team, away team, score
        let gameId = uuid();
        let data = {
            id: gameId,
            homePlayer: JSON.stringify(_.get(postData, 'homePlayer')), // expects a player object
            homeTeam: JSON.stringify(_.get(postData, 'homeTeam')),
            homeTeamScore: _.get(postData, 'homeTeamScore'),
            homeTeamPK: _.get(postData, 'homeTeamPK'),
            awayPlayer: JSON.stringify(_.get(postData, 'awayPlayer')), // expects a player object
            awayTeam: JSON.stringify(_.get(postData, 'awayTeam')),
            awayTeamScore: _.get(postData, 'awayTeamScore'),
            awayTeamPK: _.get(postData, 'awayTeamPK'),
            created_at: moment().format(),
        };

        // check for missing keys
        let missingKeys = utils.checkObjectValues(data);
        if (missingKeys.length > 0) {
            res.status(400).json({
                error: 'Missing fields data: ' + _.join(missingKeys, ', ')
            });
            return;
        }

        let params = {
            TableName: GAMES_TABLE,
            Item: data,
        };

        dynamodb.doc.put(params, function(error, data) {
            if (error) {
                console.error('There was an error adding this game', error);
                res.status(400).json({
                    error: 'There was an error adding this game',
                    // message: error.message
                });
                return;
            }

            res.json({
                message: 'Successfully added game',
                path: `${GAME_PATH_PREFIX}/${gameId}`
            });
            return;
        });
    }).catch(function(error){
        console.error('There was an error when validating the attributes for this game submission', error);
        res.status(400).json({
            error: 'There was an error adding this game',
            message: error.message
        });
        return;
    });
});

// get a game by id
router.get('/:id', function(req, res, next){
    let gameId = _.get(req.params, 'id');
    let params = {
        TableName: GAMES_TABLE,
        Key: {
            id: gameId,
        }
    };

    dynamodb.doc.get(params, function(error, data) {
        if (error) {
            console.error('There was an error getting game ' + gameId, error);
            res.status(400).json({
                error: 'There was an error getting game ' + gameId,
                message: error.message
            });
        }

        let gamesData = _.get(data, 'Item');
        if (_.has(gamesData, 'id')) {
            let fixAttr = ['awayPlayer', 'awayTeam', 'homePlayer', 'homeTeam'];
            let out = {
                game: utils.attrsToObject(fixAttr, gamesData),
            }
            res.json(out);
        } else {
            res.json({message: 'This game does not exist.'});
        }
    });
});

// remove a game by id
router.delete('/:id', function(req, res, next){
    let gameId = _.get(req.params, 'id');

    let params = {
        TableName: GAMES_TABLE,
        Key: {
            id: gameId,
        },
    };

    dynamodb.doc.delete(params, function(error, data) {
        if (error) {
            console.error('There was an error deleting game ' + gameId, error);
            res.status(400).json({
                error: 'There was an error deleting game ' + gameId,
                message: error.message
            });
        }

        res.json({
            message: 'Successfully deleted game'
        });
    });
});

module.exports = router;
