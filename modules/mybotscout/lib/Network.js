/**************/
/* Network.js */
/**************/

var irc = require('irc');

var Channel = require('./Channel');

/**
 *  Costructor
 */
function Network(mybotscout, cfg)
{
    this.mybotscout = mybotscout;

    this.host    = cfg.host;
    this.name    = cfg.host;

    this.debug = false;
    this.delay = 2000;
    this.nick  = 'yosot'+new Date().getTime()+"mbtcu";

    this.commands = null;

    this.channels     = [];
    this.maxChannels  = 3;
    this.openChannels = [];
    this.iLastChannel = -1;

    this.client = new irc.Client(this.host, this.nick, {
        autoConnect: false,
        stripColors: true,
        retryCount: 0,
        debug: this.debug
    });

    this.client.setMaxListeners(30);

    this.AddListener('registered' , this.OnRegistered );
    this.AddListener('channellist', this.OnChannelList);
    this.AddListener('join'       , this.OnJoin       );
    this.AddListener('part'       , this.OnPart       );
    this.AddListener('names'      , this.OnNames      );
    this.AddListener('nick'       , this.OnNick       );
    this.AddListener('notice'     , this.OnNotice     );
    this.AddListener('raw'        , this.OnRaw        );
    this.AddListener('error'      , this.OnError      );
    this.AddListener('abort'      , this.OnAbort      );

    this.status = "CONNECTING";
    this.statusTime = this.CurrentTime();

    this.client.connect(this.OnConnected.bind(this));
};

/**
 *  add listener
 */
Network.prototype.AddListener = function(event, callback)
{
    this.client.addListener(event, callback.bind(this));
};

/**
 *  connected callback
 */
Network.prototype.OnConnected = function(message)
{
    this.status = "CONNECTED";
    this.statusTime = this.CurrentTime();
    this.Log('CONNECTED to '+this.name);
    this.List();
};

/**
 *  registered event
 */
Network.prototype.OnRegistered = function(message)
{
    this.Debug('REGISTERED: ' + JSON.stringify(message));
    this.Log(message.args[1]);
    this.nick = message.args[0];
};

/**
 *  channellist event
 */
Network.prototype.OnChannelList = function(channels, message)
{
    this.channels = channels;
    var network = this;
    channels.forEach(function(channel, index, array) {
        network.Debug(">>>>>>>>>>> "+channel.name);
//      network.Log('CHANNEL: ' + JSON.stringify(channel));
    });
    this.ScoutChannels();
};

/**
  *  names event
  */
Network.prototype.OnNames = function(channel, nicks)
{
    this.Debug('CHANNEL: ' + JSON.stringify(channel));
    this.Debug('NICKS: ' + JSON.stringify(nicks));
    for (var i = 0; (i < this.openChannels.length); i++) {
        if (channel == this.openChannels[i].name) {
            this.openChannels[i].OnNames(nicks);
        }
    }
};

/**
 *  join event
 */
Network.prototype.OnJoin = function(channel, nick, message)
{
    if (nick == this.nick) {
        for (var i = 0; (i < this.openChannels.length); i++) {
            if (channel == this.openChannels[i].name) {
                this.openChannels[i].OnJoin(message);
                return;
            }
        }
        this.Part(channel);
    }
};

/**
  *  part event
  */
Network.prototype.OnPart = function(channel, nick, reason, message)
{
    if (nick == this.nick) {
        for (var i = 0; (i < this.openChannels.length); i++) {
            if (channel == this.openChannels[i].name) {
                message._done_ = true;
                this.openChannels[i].OnPart(reason, message);
                break;
            }
        }
    }
};

/**
 *  abort event
 */
Network.prototype.OnAbort = function(message)
{
    this.status = "ABORTED";
    this.statusTime = this.CurrentTime();
    this.Log('!!!!! ABORTED !!!!! ' + this.host);
};

/**
 *  error event
 */
Network.prototype.OnError = function(message)
{
    if ((message.args.length >= 2) && (message.args[0] == this.nick)) {
        for (var i = 0; (i < this.openChannels.length); i++) {
            if (message.args[1] == this.openChannels[i].name) {
                if (this.openChannels[i].joined == false) {
                    if (message.command == "err_bannedfromchan") {
                        message._done_ = true;
                        this.Log("WARNING Can't join to " + message.args[1] + ': ' + message.args[2] + ' (' + message.rawCommand + ').');
                        this.openChannels[i].ClearTimeout();
                        this.ScoutChannels(this.openChannels[i]);
                        return;
                    }
                }
                if (message.command == "err_cannotsendtochan") {
                    if (this.openChannels[i].status == "JOINED") {
                        message._done_ = true;
                        this.Log("WARNING Sending to " + message.args[1] + ': ' + message.args[2] + ' (' + message.rawCommand + ').');
                        return;
                    }
                }
                if (message.command == "err_notonchannel") {
                    if (this.openChannels[i].status == "PARTING") {
                        message._done_ = true;
                        this.Log("WARNING Parting from " + message.args[1] + ': ' + message.args[2] + ' (' + message.rawCommand + ').');
                        this.openChannels[i].ClearTimeout();
                        this.ScoutChannels(this.openChannels[i]);
                        return;
                    }
                }
            }
        }
    }
    this.Log('ERROR: ' + JSON.stringify(message));
};

/**
 *  nick event
 */
Network.prototype.OnNick = function(oldnick, newnick, channels, message)
{
    if (this.nick == oldnick) {
        this.Log('##### nick renamed from '+oldnick+' to '+newnick);
        this.nick = newnick;
    }
};

/**
 *  notice event
 */
Network.prototype.OnNotice = function(nick, to, text, message)
{
    if (this.nick == to) {
        for (var i = 0; (i < this.openChannels.length); i++) {
            this.openChannels[i].OnNotice(nick, text, message);
        }
    }
};

/**
 *  raw event
 */
Network.prototype.OnRaw = function(message)
{
    switch (message.command) {
        case '477':
            if ((message.args.length >= 3) && (message.args[0] == this.nick)) {
                for (var i = 0; (i < this.openChannels.length); i++) {
                    if ((message.args[1] == this.openChannels[i].name) &&
                        (this.openChannels[i].joined == false)) {
                        this.Log("WARNING Can't join to " + message.args[1] + ': ' + message.args[2] + ' (477).');
                        this.openChannels[i].ClearTimeout();
                        this.ScoutChannels(this.openChannels[i]);
                        return;
                    }
                }
            }
            break;
        case "ERROR":
        case "ERRORE":
            this.Log("!!!!! ERROR !!!!! "+message.args[0]);
            break;
        default:
            if (message.commandType != "error") {
                if ((message.args.length >= 2) && (message.args[0] == this.nick)) {
                    for (var i = 0; (i < this.openChannels.length); i++) {
                        if ((message.args[1] == this.openChannels[i].name) &&
                            (this.openChannels[i].joined == false)) {
                            this.Log('COMMAND: ' + message.command + ' ' + message.args[0] + ' ' + message.args[1]);
                            return;
                        }
                    }
                }
            }
            break;
    }
    this.Debug('RAW: ' + JSON.stringify(message));
    if (!this.debug && (message._done_ != true) && (message.command != "rpl_listend")) {
        for (var i = 0; (i < this.openChannels.length); i++) {
            if ((this.openChannels[i].joined == false) && (message.args.length >= 1) && (message.args[0] == this.openChannels[i].name)) {
                this.Log('RAW: ' + JSON.stringify(message));
                break;
            }
        }
    }
    this.lastMessage = message;
};

/**
 *  list command
 */
Network.prototype.List = function(onExec)
{
    this.Defer(function(){ this.client.list(); }.bind(this), onExec);
};

/**
  *  Joins the specified channel.
  */
Network.prototype.Join = function(channel, onExec)
{
    this.Defer(function(){ this.client.join(channel); }.bind(this), onExec);
};

/**
  *  Parts the specified channel.
  */
Network.prototype.Part = function(channel, onExec)
{
    this.Defer(function(){ this.client.part(channel); }.bind(this), onExec);
};

/**
 *  Sends a message to the specified target.
 */
Network.prototype.Say = function(target, message, onExec)
{
    this.Defer(function(){ this.client.say(target, message); }.bind(this), onExec);
};

/**
 *  log
 */
Network.prototype.Log = function(text)
{
    this.mybotscout.Log(text);
};

/**
 *  debug
 */
Network.prototype.Debug = function(text)
{
    this.mybotscout.Debug(text);
};

/**
 *  defer a call
 */
Network.prototype.Defer = function(func, onExec)
{
    if (this.commands == null) {
        this.commands = [];
        this.intervalId = setInterval(this.Scheduler.bind(this), this.delay);
    }
    this.commands.push({ func: func, onExec: onExec });
};

/**
 *  commands scheduler
 */
Network.prototype.Scheduler = function()
{
    if (this.commands.length > 0) {
        var exec = this.commands.shift();
        exec.func();
        if (exec.onExec)
            exec.onExec();
    }
};

/**
 *  Scout the channels.
 */
Network.prototype.ScoutChannels = function(channel)
{
    if (channel) {
        for (var i = 0; (i < this.openChannels.length); i++) {
            if (this.openChannels[i].name == channel.name) {
                this.openChannels.splice(i,1);
                break;
            }
        }
    }
    if (this.channels.length == 0) {
        this.List();
        return;
    }
    var iStart = (this.iLastChannel + 1);
    while (this.openChannels.length < this.maxChannels) {
        if (++this.iLastChannel >= this.channels.length)
            this.iLastChannel = 0;
        for (var i = 0; (i < this.openChannels.length); i++)
            if (this.openChannels[i].name == this.channels[this.iLastChannel].name)
                break;
        if (i < this.openChannels.length) {
            if (this.iLastChannel == iStart)
                break;
        } else {
            this.openChannels[this.openChannels.length] =
                new Channel(this, this.channels[this.iLastChannel].name);
        }
    }
};

/**
 *  Get current time.
 */
Network.prototype.CurrentTime = function()
{
    return this.mybotscout.CurrentTime();
};

/**
 *  Format time.
 */
Network.prototype.FormatTime = function(tm)
{
    return this.mybotscout.FormatTime(tm);
};

/**
 *  Send network status.
 */
Network.prototype.SendStatus = function(res)
{
    res.write("Network "+this.host+' '+this.status+' at '+this.FormatTime(this.statusTime)+'<br/>');
    this.openChannels.forEach(function(channel) {
        channel.SendStatus(res);
    });
    res.write("    Last : "+JSON.stringify(this.lastMessage)+'<br/>');
}

/**
 *  export class
 */
module.exports = Network;

/********************/
/* Network.js : EOF */
/********************/

