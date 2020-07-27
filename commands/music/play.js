'use strict';
const corePlayer = require('./../../core/player');
const htmlEntitiesDecoder = require('html-entities-decoder');
const {MessageEmbed, MessageCollector} = require('discord.js');
const ytdl = require('ytdl-core');

module.exports = {
    name: 'play',
    description: 'Play a music',
    usage: 'play (url | title)',
    aliases: ['p'],
    category: 'music',
    botPerm: ['CONNECT', 'SPEAK', 'MANAGE_MESSAGES', 'EMBED_LINKS', 'ADD_REACTIONS'],
    userPerm: [],
    admin: false,
    nsfw: false,
    guildOnly: true,
    enabled: true,
    execute: async function(client, message, args) {
      if (!message.member.voice.channel) return message.channel.send(`You must connect on the voice channel before !`);
      
      const player = corePlayer.initPlayer(client, message.guild.id);

      if (!corePlayer.hasPermission(client, message) &&
        (message.guild.me.voice.channel && message.member.voice.channel.id === message.guild.me.voice.channel.id)) return message.channel.send(`Do you not have necessery permission`);

      player.connection = await message.member.voice.channel.join();

      if (!args.join('') && player.queue.length >= 1) return corePlayer.play(client, message);

      const youtube = await corePlayer.getSongs(args.join(' '));
      if (youtube.error) return message.channel.send(youtube.error.message, {code: 'js'});
      if (youtube.isAxiosError) return message.channel.send(`ERROR: code http ${youtube.status}`);

      for (const key in youtube.items) {
        youtube.items[key].snippet.title = htmlEntitiesDecoder(youtube.items[key].snippet.title);
      };

      const listEmbed = new MessageEmbed()
        .setTitle(`here is music list`)
        .setDescription(youtube.items.map((v, i) => `[${i+1}] ${v.snippet.title}`).join('\n'))
        .setTimestamp(Date.now())
        .setFooter(`Entre \`cancel\` for exit selection`);
      message.channel.send({embed: listEmbed}).then((msg) => {
        const filter = (msg) => msg.author.id === message.author.id;
        const collector = new MessageCollector(message.channel, filter, {
          time: 20000,
        });
        collector.on('collect', async (msgCollected) => {
          const choice = msgCollected.content.trim().split()[0];
          if (choice.toLowerCase() === 'cancel') {
            return collector.stop('STOPPED');
          };
          if (!choice || isNaN(choice)) {
            return message.channel.send(`Your choice is invalid`);
          };
          if (choice > youtube.items.length || choice <= 0) {
            return message.reply(`Your choice is not finding in the selection`);
          };
          const song = youtube.items[choice - 1];
          collector.stop('PLAY');
          msg.delete();
          msgCollected.delete();
          if (song.id.kind === 'youtube#channel') {
            return message.channel.send(`I can't play a video with a channel`);
          };
          const info = await ytdl.getBasicInfo(`https://www.youtube.com/watch?v=${song.id.videoId}`);
          song.time = JSON.parse(JSON.stringify(info)).length_seconds*1000;
          song.request = message.member;
          player.queue.push(song);
          player.type = 'player';
          let allTime = 0;
          player.queue.map(v => allTime = allTime + v.time/1000);
          const addQueueEmbed = new MessageEmbed()
              .setTitle(`Add music in playlist`)
              .setDescription(song.snippet.title)
              .addFields(
                  {name: 'Song time', value: `${corePlayer.parseSeconde(song.time/1000)}`, inline: true},
                  {name: 'Playlist time', value: `${corePlayer.parseSeconde(allTime)}`, inline: true},
              )
              .setThumbnail(song.snippet.thumbnails.high.url);
          message.channel.send({embed: addQueueEmbed});
          if (player.queue.length > 1) {
            if (!player.dispatcher) {
                corePlayer.play(client, message);
            };
          } else {
            if (player.queue.length <= 1) {
              player.index = 0;
            };
            corePlayer.play(client, message);
          };
        });
        collector.on('end', (collected, reason) => {
          if (reason === 'STOPPED') {
            return message.reply('You have cancelled the selection');
          } else if (reason === 'PLAY') {
            return false;
          } else {
            return message.reply('Do you not have select a song');
          };
        });
      });
    },
};
