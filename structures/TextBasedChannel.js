'use strict';

const {
    TextChannel,
    User,
    GuildMember,
    APIMessage,
    StringResolvable,
} = require('discord.js');
const embedContructor = require('./../core/embedConstructor');

TextChannel.prototype.send = async function (content, options, forceCustom = false) {
    if (content.embed) content.embed = embedContructor(content.embed, forceCustom);

    if (this instanceof User || this instanceof GuildMember) {
        return this.createDM().then((dm) => dm.send(content, options))
    };

    let apiMessage;

    if (content instanceof APIMessage) {
        apiMessage = content.resolveData();
    } else {
        apiMessage = APIMessage.create(this, content, options).resolveData();
        if (Array.isArray(apiMessage.data.content)) {
            return Promise.all(apiMessage.split().map(this.send.bind(this)));
        };
    };

    const {
        data,
        files
    } = await apiMessage.resolveFiles();
    return this.client.api.channels[this.id].messages
        .post({ data, files })
        .then(d => this.client.actions.MessageCreate.handle(d).message);
};