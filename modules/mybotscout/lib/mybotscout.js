/*****************/
/* mybotscout.js */
/*****************/

var http    = require('http');
var express = require('express');
var tz      = require('timezone/loaded');

var Network = require('./Network');

/**
 *  Costructor
 */
function mybotscout(cfg)
{
    if (module.exports.singleton)
        throw new Error('mybotscout already instanced')
    module.exports.singleton = this;

    this.SetupTerminationHandlers();

    this.cfg = cfg;

    this.startedAt = this.CurrentTime();

    this.app = express();
    this.app.get('/status', this.SendStatus.bind(this));
    this.app.listen(cfg.port, cfg.addr, this.OnListening.bind(this));

    this.networks = [];
    [
        'irc.FoReVeR-irc.it',
        'irc.chlame.net',
        'irc.crocmax.net',
        'irc.netamici.net',
        'irc.openjoke.org',
        'irc.oceanirc.net',
        'irc.oltreirc.net'
    ].forEach((function(host) {
        this.networks[this.networks.length] = new Network(this, { host: host, logTime: false });
    }).bind(this));

    setInterval(this.PingAll.bind(this), 300000);
};

/**
 *  Setup termination handlers (for exit and a list of signals).
 */
mybotscout.prototype.SetupTerminationHandlers = function()
{
    //  Process on exit and signals.
    process.on('exit', (function() { this.Terminator(); }).bind(this));
    // Removed 'SIGPIPE' from the list - bugz 852598.
    ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
     'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
    ].forEach((function(element, index, array) {
        process.on(element, (function() { this.Terminator(element); }).bind(this));
    }).bind(this));
};

/**
 *  terminator === the termination handler
 *  Terminate server on receipt of the specified signal.
 *  @param {string} sig  Signal to terminate on.
 */
mybotscout.prototype.Terminator = function(sig)
{
    if (sig) {
       this.Log('Received '+sig+' - terminating mybotscout ...');
       process.exit(1);
    }
    this.Log('mybotscout stopped.');
};

/**
 *  On Listening event
 */
mybotscout.prototype.OnListening = function()
{
    this.Log("Listening on " + (this.cfg.addr ? this.cfg.addr+':' : 'port ') + this.cfg.port);
};

/**
 *  Send mybotscout status.
 */
mybotscout.prototype.SendStatus = function(request, response)
{
    response.setHeader('Content-Type', 'text/html');
    response.write('<html><body><pre>');
    response.write("Started at : "+this.FormatTime(this.startedAt)+'<br/>');
    this.networks.forEach(function(network) {
        network.SendStatus(response);
    });
    response.write('</pre></body></html>');
    response.end();
};

/**
 *  Ping all mybotscout.
 */
mybotscout.prototype.PingAll = function()
{
    [
        "http://mybotscout-iggirone.rhcloud.com/status",
        "http://mybotscout.herokuapp.com/status",
        "http://mybotscout.dotcloudapp.com/status",
        "http://mybotscout.apphb.com/status"
    ].forEach((function(url) {
        http.get(url, (function(res) {
            if (res.statusCode == 200) {
                var data = "";
                res.on('data', (function(chunk) {
                      data += chunk;
                }).bind(this));
                res.on('end', (function() {
                    this.Log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>\n"+
                             "STATUS ("+url+")\n" +
                             "------------------------------------------------------------------------------------\n"+
                             data.replace(/<br\/>/g,"\n").replace(/<(html|body|pre|\/(pre|body|html))>/g,"")+
                             "<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");
                }).bind(this));
            } else {
                this.Log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"+
                         "STATUS ("+url+") - BAD HTTP STATUS: " + res.statusCode + "\n" +
                         "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
            }
        }).bind(this)).on('error', (function(e) {
            this.Log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"+
                     "STATUS ("+url+") - ERROR: " + e.message + "\n" +
                     "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        }).bind(this));
    }).bind(this));
};

/**
 *  log
 */
mybotscout.prototype.Log = function(text)
{
    if (this.cfg.logTime) {
        var prefix = this.FormatTime();
        text = (prefix + " : " + text);
        text = text.replace(/\n/g, "\n"+prefix.replace(/./g, " ")+" : ");
    }
    console.log(text);
};

/**
 *  debug
 */
mybotscout.prototype.Debug = function(text)
{
    if (this.cfg.debug)
        this.Log(text);
};

/**
 *  Get current time.
 */
mybotscout.prototype.CurrentTime = function()
{
    return new Date();
};

/**
 *  Format time.
 */
mybotscout.prototype.FormatTime = function(tm)
{
    if (!tm)
        tm = this.CurrentTime();
    return tz(tm, '%Y-%m-%d %H:%M:%S %Z', 'it_IT', 'Europe/Rome'); 
};

/**
 *  export creator
 */
module.exports = function(cfg) {
    if (module.exports.singleton)
        return module.exports.singleton;
    else
        return new mybotscout(cfg);
};

/***********************/
/* mybotscout.js : EOF */
/***********************/

