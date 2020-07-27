'use strict';
const express = require('express');
const app = express();
const corePlayer = require('./../core/player');

module.exports = (client) => {
    /** Setup control origin */
    app.use(function(req, res, next) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods',
            'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers',
            'X-Requested-With, Content-Type, Authorization');
        if ('OPTIONS' == req.method) {
          res.sendStatus(204);
        } else {
          next();
        };
    });

    app.use(express.json());
    app.use(express.urlencoded({extended: true}));

    app.get('/api/:id/playlists', (req, res) => {
        const player = corePlayer.initPlayer(client, req.params.id);
        return res.status(202).json({
            queue: player.queue,
            index: player.index,
            isPlaying: player.isPlaying,
            volume: player.volume,
            type: player.type,
            loop: player.loop,
        });
    });

    app.get('/api/control/:id/loop', (req, res) => {
        const player = corePlayer.initPlayer(client, req.params.id);
        if (player.loop === 'off') {
            player.loop = 'on';
        } else if (player.loop === 'on') {
            player.loop = 'once';
        } else /* if (player.loop === 'once')*/{
            player.loop = 'off';
        };

        return res.status(202).json({loop: player.loop});
    });

    app.get('/api/control/:id/play/:index', (req, res) => {
        const player = corePlayer.initPlayer(client, req.params.id);
        player.index = req.params.index;

        corePlayer.play(client, null,  0, req.params.id);

        return res.status(202).json({
            queue: player.queue,
            index: player.index,
            isPlaying: player.isPlaying,
            volume: player.volume,
            type: player.type,
            loop: player.loop,
        });
    });

    app.get('/api/control/:id/pause', (req, res) => {
        const player = corePlayer.initPlayer(client, req.params.id);
        player.dispatcher.pause();

        return res.status(202).json({message: 'OK'});
    });

    app.get('/api/control/:id/resume', (req, res) => {
        const player = corePlayer.initPlayer(client, req.params.id);
        player.dispatcher.resume();

        return res.status(202).json({message: 'OK'});
    });

    app.listen(8080, '0.0.0.0', () => console.log('server listening on https://localhost:8080'))
};