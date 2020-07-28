'use strict';
const credentials = require('./../credentials');
const axios = require('axios');
const { MessageEmbed } = require('discord.js');
const ytdl = require('ytdl-core');

/**
 * init the player
 * @param {Client} client 
 * @param {Snowflake} guildID 
 * @return {Object}
 */
module.exports.initPlayer = function (client, guildID) {
    if (!client.music[guildID]) {
        client.music[guildID] = {
            queue: [],
            index: 0,
            isPlaying: false,
            volume: 0.50,
            type: null,
            dispatcher: false,
            connection: false,
            loop: 'off',
            broadcast: false,
            muteIndicator: false,
            backup: {
                index: null,
                seek: null,
            },
        };
    };
    return client.music[guildID];
};

/**
 * Save data in backup
 * @param {Client} client 
 * @param {Message} message 
 */
module.exports.heathBeat = function (client, guildID) {
    const player = this.initPlayer(client, guildID);
    player.backup.index = player.index;
    player.dispatcher ? player.backup.seek = player.dispatcher.streamTime : null;
};

/**
 * check if the user has the permissions necessery
 * @param {Client} client
 * @param {Message} message
 * @param {Boolean}
 */
module.exports.hasPermission = function (client, message) {
    const player = this.initPlayer(client, message.guild.id);
    if (message.member.hasPermission(['ADMINISTRATOR'], { checkAdmin: true, checkOwner: true })) {
        return true;
    } else {
        if (message.member.roles.cache.find(role => role.name === 'DJ')) {
            return true;
        } else {
            if (!player.dispatcher) {
                return true;
            } else {
                if (message.guild.me.voice.channel && message.guild.me.voice.channel.members.size < 2) {
                    return true;
                } else {
                    return false;
                };
            };
        };
    };
};

/**
 * Get songs
 * @param {String} query
 * @return {Promise<Object>}
 */
module.exports.getSongs = async function (query) {
    return await axios.get(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&key=${credentials.YOUTUBE_TOKEN}&q=${encodeURI(query)}`).then((response) => response.data).catch((error) => error);
};

module.exports.parseSeconde = function (seconds) {
    const format = val => `0${Math.floor(val)}`.slice(-2);
    const hours = seconds / 3600;
    const minutes = (seconds % 3600) / 60;

    return [hours, minutes, seconds % 60].map(format).join(':');
};

let interval;

module.exports.presence = async function (client, options, autoclear = true, guildID) {
    if (client.config.singleServer) client.user.setPresence(options);
    else return;
    if (autoclear) {
        interval = setInterval(() => {
            if (!this.initPlayer(client, guildID).dispatcher) {
                client.user.setPresence({
                    status: 'online',
                    activity: {
                        name: '',
                    },
                });
                return clearInterval(interval);
            };
        }, 5000);
    } else {
        return interval ? clearInterval(interval) : null;
    };
};

/**
 * Play a song
 * @param {Message} message 
 */
module.exports.play = async function (client, message, seek = 0, guildID = null) {
    const player = this.initPlayer(client, message ? message.guild.id : guildID);
    if (!player.queue || player.queue.length < 1) {
        this.presence(client, {
            status: 'online',
            activity: {
                name: '',
            },
        }, false);
        return message ? message.channel.send(`The playlist is empty`) : null;
    };
    if (!player.queue[player.index]) {
        player.index = player.queue.length;
        if (!player.queue[player.index]) {
            player.index = 0;
            if (!player.queue[player.index]) {
                this.presence(client, {
                    status: 'online',
                    activity: {
                        name: '',
                    },
                }, false);
                return message ? message.channel.send(`The playlist is empty`) : null;
            };
        };
    };
    player.dispatcher = player.connection.play(
        await ytdl(`https://www.youtube.com/watch?v=${player.queue[player.index].id.videoId}`, {
            filter: 'audioonly',
            quality: 'highestaudio',
        }), {
        volume: player.volume,
        highWaterMark: 20,
        seek,
    },
    );
    const heatBeat = setInterval(() => {
        this.heathBeat(client, message ? message.guild.id : guildID);
    }, 5000);
    player.connection.voice.setSelfDeaf(true);
    player.connection.voice.setSelfMute(false);
    player.broadcast = false;
    this.presence(client, {
        status: 'dnd',
        afk: false,
        activity: {
            id: client.user.id,
            name: player.queue[player.index].snippet.title,
            type: 'LISTENING',
            url: `https://www.youtube.com/watch?v=${player.queue[player.index].id.videoId}`,
        },
    }, true, message ? message.guild.id : guildID);
    if (!player.muteIndicator) {
        const playNowEmbed = new MessageEmbed()
            .setTitle(`Now playing`)
            .setDescription(player.queue[player.index].snippet.title)
            .setThumbnail(player.queue[player.index].snippet.thumbnails.default.url)
        message ? message.channel.send({ embed: playNowEmbed }) : null;
    } else {
        message ? message.react('👌') : null;
    };
    player.dispatcher.on('finish', async () => {
        console.log('finish');
        clearInterval(heatBeat);
        if (player.dispatcher) player.dispatcher.destroy();
        player.dispatcher = null;
        if (player.loop === 'off' && player.queue.length !== 0) {
            player.queue.shift();
            if (player.queue.length === 0) {
                return this.play(client, message, 0, guildID);
            };
            player.index = 0;
            this.play(client, message, 0, guildID);
        } else if (player.loop === 'on') {
            if (player.index === player.queue.length - 1) {
                player.index = 0;
            } else {
                player.index++;
            };
            this.play(client, message, 0, guildID);
        } else if (player.loop === 'once') {
            this.play(client, message, 0, guildID);
            player.index = player.index;
        };
    });
    let r;
    player.dispatcher.on('speaking', (s) => {
        if (s === r) return;
        r = s;
        player.isPlaying = r === 1 ? true : false;
    });
    player.dispatcher.on('error', async (err) => {
        clearInterval(heatBeat);
        console.error(err);
        message ? message.channel.send(err, { code: 'js' }) : null;
        player.index = player.backup.index;
        return this.play(client, message, player.backup.seek / 100, guildID);
    });
};

/**
 * Call request
 * @param {Message} message
 * @param {MessageEmbed} embed
 * @param {Object} options
 * @param {String} options.required
 * @param {String} options.complete
 * @param {String} options.content
 * @return {Promise<Boolean>} 
 */
module.exports.callRequest = async function (message, embed, options) {
    return new Promise(async (resolve) => {
        let m = await message.channel.send({ embed })
        const members = message.member.voice.channel.members.filter((m => !m.user.bot));
        if (members.size > 1) {
            m.react('👍');
            let mustVote = Math.floor(members.size / 2 + 1);
            embed.setDescription(options.required.replace(/{{mustVote}}/g, mustVote));
            m.edit({ embed });

            let filter = (reaction, user) => {
                let member = message.guild.members.cache.get(user.id);
                let voiceChannel = member.voice.channel;
                if (voiceChannel) {
                    if (voiceChannel.id === message.member.voice.channelID) {
                        return true;
                    } else {
                        return false;
                    };
                };
            };

            let collector = await m.createReactionCollector(filter, {
                time: 25000
            });

            collector.on("collect", (reaction, user) => {
                let haveVoted = reaction.count - 1;
                if (haveVoted >= mustVote) {
                    embed.setDescription(options.complete);
                    m.edit({ embed });
                    collector.stop(true);
                    resolve(true);
                } else {
                    embed.setDescription(options.content.replace(/{{haveVoted}}/g, haveVoted).replace(/{{mustVote}}/g, mustVote));
                    m.edit({ embed });
                };
            });

            collector.on("end", (collected, isDone) => {
                if (!isDone) {
                    return resolve(false);
                };
            });

        } else {
            resolve(true);
        };
    });
};
