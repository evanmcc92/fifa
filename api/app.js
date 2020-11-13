'use strict'

const serverless = require('serverless-http')
const express = require('express')

const app = express()
const gamesRouter = require('./routes/games')
const playersRouter = require('./routes/players')
const teamsRouter = require('./routes/teams')

const GAME_PATH_PREFIX = process.env.GAME_PATH_PREFIX
const PLAYER_PATH_PREFIX = process.env.PLAYER_PATH_PREFIX
const TEAM_PATH_PREFIX = process.env.TEAM_PATH_PREFIX

app.use(GAME_PATH_PREFIX, gamesRouter)
app.use(PLAYER_PATH_PREFIX, playersRouter)
app.use(TEAM_PATH_PREFIX, teamsRouter)

module.exports.handler = serverless(app)
