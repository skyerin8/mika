'use strict';

const constant = {
    '<@': 'username',
    '<@!': 'nickname',
    '<@&': 'role',
    '<#': 'channel',
    '<:': 'emoji',
    '<a:': 'gifemoji',
};

/**
 * @typedef ParseRaw
 * 
 * @property {Array<string>} parse
 * @property {Array<string>} str
 */

/**
 * @typedef ParseRange
 * 
 * @property {Array<string>} username
 * @property {Array<string>} nickname
 * @property {Array<string>} role
 * @property {Array<string>} channel
 * @property {Array<string>} emoji
 * @property {Array<string>} gifemoji
 * @property {Array<string>} str
 */

/**
 * @param {string|Array<string>} str
 * @param {Object} options
 * @param {Boolean} [options.range=false]
 * @param {Boolean} [options.autoremove=false]
 * @return {ParseRaw|ParseRange}
 * @example
 * parse(['hello', 'world', '<#737321162958176425>'], {range: true, autoremove: true})
 */
function parse(str, options = {range: false, autoremove: false}) {
    if (!Array.isArray(str)) str = str.trim().split(/ +/g);
    if (!Array.isArray(str)) throw Error('str is not string or array');
    let data = null;
    if (options.range) {
        data = {};
        for (const [key, value] of Object.entries(constant)) {
            data[value] = [];
            for (const entrie in str) {
                if(str[entrie].startsWith(key)) {
                    data[value].push(str[entrie].match(/[0-9]{1,20}/g)[0]);
                    if (options.autoremove) {
                        str.splice(entrie, 1);
                    };
                };
            };
        };
    } else {
        data = {
            parse: [],
        };
        for (const key of Object.keys(constant)) {
            for (const entrie in str) {
                if(str[entrie].startsWith(key)) {
                    data.parse.push(str[entrie].match(/[0-9]{1,20}/g)[0]);
                    if (options.autoremove) {
                        str.splice(entrie, 1);
                    };
                };
            };
        };
    };
    data.str = str;
    return data;
};