'use strict';

const {
    embed: customEmbed
} = require('./../config');

/**
 * @typedef Field
 * 
 * @property {string} name
 * @property {string} value
 * @property {Boolean} inline
 */

/**
 * @typedef Author
 * 
 * @property {string} name
 * @property {string} icon_url
 * @property {string} url
 */

/**
 * @typedef Thumbnail
 * 
 * @property {string} url
 */

/**
 * @typedef Image
 * 
 * @property {string} url
 */

/**
 * @typedef Footer
 * 
 * @property {string} text
 * @property {string} icon_url
 */

/**
 * @typedef Embed
 * 
 * @property {string} color
 * @property {string} title
 * @property {string} url
 * @property {Author} author
 * @property {string} description
 * @property {Thumbnail} thumbnail
 * @property {Array<Field>} fields
 * @property {Image} image
 * @property {Date} timestamp
 * @property {Footer} footer
 */

/**
 * 
 * @param {Embed} raw 
 * @param {Boolean} forceCustom 
 */
module.exports = (raw, forceCustom = true) => {
    let embed;
    const fields = customEmbed.fields;
    delete customEmbed.fields;
    if (!forceCustom) embed = Object.assign(raw, customEmbed);
    else embed = Object.assign(customEmbed, raw);
    if (!forceCustom && fields) Array.isArray(embed.fields) ? fields.map(v => embed.fields.push(v)) : embed.fields = fields;

    return embed;
};