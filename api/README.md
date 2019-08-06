# FIFA 19 Local Rivalry API

## Description
The purpose of this API is to track the games you play with friends locally. This is affiliated with EA FIFA 19 so it will not sync with anything. This is solely meant to keep track of games played.

## Setup

This API runs on Node.js 8.10 as a AWS Lambda using DyanmoDB.

To get this up and running you will need to clone the database, run `npm install` and then create a local database running `sls dynamodb install` and `sls dynamodb start`. This will create the tables and seed the teams table with data.

## Endpoints

### Players
#### `GET /players`
#### `GET /players/:id`
#### `GET /players/:id/games`
#### `POST /players`
Body:
```json
{
    "fname": "string",
    "lname": "string",
    "favTeam": "team object <optional>",
}
```
#### `DELETE /players/:id`

### Games
#### `GET /games`
#### `GET /games/:id`
#### `POST /games`
Body:
```json
{
    "homePlayer": "player object",
    "homeTeam": "team object",
    "homeTeamScore": "string",
    "homeTeamPK": "string",
    "awayPlayer": "player object",
    "awayTeam": "team object",
    "awayTeamScore": "string",
    "awayTeamPK": "string",
}
```
#### `DELETE /games/:id`

### Teams
#### `GET /teams`
query params:
`country`: string
`league`: string
`teamName`: string
#### `GET /teams/:id`
