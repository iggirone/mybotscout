/**************/
/* Channel.js */
/**************/

var Bot = require('./Bot');

/**
 *  Costructor
 */
function Channel(network, name)
{
    this.network = network;
    this.name    = name   ;
    this.joined  = false  ;
    this.parted  = false  ;

    this.bots     = [];
    this.maxBots  = 1;
    this.openBots = [];
    this.iLastBot = -1;

    this.status = "JOINING";
    this.statusTime = this.network.CurrentTime();
    this.network.Debug(" channel >>> "+name);
    this.network.Join(this.name, function() {
        this.network.Log('JOINING to '+this.name+' @ '+this.network.name+' ...'); 
        this.SetTimeout();
    }.bind(this));
};

/**
 *  join event
 */
Channel.prototype.OnJoin = function(message)
{
    if (this.joined == false) {
        this.joined = true;
        this.ClearTimeout();
//      this.network.Log("     >>>>>> "+nick);
//      this.network.Log("     >>>>>> "+JSON.stringify(message));
        this.status = "JOINED";
        this.statusTime = this.network.CurrentTime();
        this.network.Log("JOINED to " + this.name+' @ '+this.network.name);
        this.network.Say(this.name, "I'm a bot!");
    } else {
        this.network.Log("##### REPETED EVENT join "+this.network.nick+" to "+this.name)+' @ '+this.network.name;
    }
};

/**
 *  part event
 */
Channel.prototype.OnPart = function(reason, message)
{
    if (this.parted == false) {
        this.parted = true;
        this.ClearTimeout();
//      this.network.Log("     <<<<<< "+nick);
//      this.network.Log("     <<<<<< "+JSON.stringify(message));
        this.status = "PARTED";
        this.statusTime = this.network.CurrentTime();
        this.network.Log("PARTED from " + this.name+' @ '+this.network.name);
        this.network.ScoutChannels(this);
    } else {
        this.network.Log("##### REPETED EVENT part "+this.network.nick+" from "+this.name+' @ '+this.network.name);
    }
};

/**
  *  names event
  */
Channel.prototype.OnNames = function(nicks)
{
    this.bots = [];
    var channel = this;
    Object.keys(nicks).forEach(function(nick, index, array) {
        channel.network.Debug(">>>>>>>>>>> "+nick+' '+nicks[nick]);
        if (nicks[nick] == '+')
            channel.bots[channel.bots.length] = { name: nick, status: null };
    });
//  channel.network.Log('NICKS: ' + JSON.stringify(this.bots));
    this.ScoutBots();
};

/**
 *  notice event
 */
Channel.prototype.OnNotice = function(nick, text, message)
{
    for (var i = 0; (i < this.openBots.length); i++) {
        if (this.openBots[i].name == nick) {
            this.openBots[i].OnNotice(text, message);
            break;
        }
    }
};

/**
  *  Scout the bots.
  */
Channel.prototype.ScoutBots = function(bot)
{
    if (bot) {
        for (var i = 0; (i < this.openBots.length); i++) {
            if (this.openBots[i].name == bot.name) {
                this.openBots.splice(i,1);
                break;
            }
        }
    }
    if (this.openBots.length < this.maxBots)
        if (this.iLastBot < (this.bots.length - 1))
            this.openBots[this.openBots.length] =
                new Bot(this, this.bots[++this.iLastBot].name);
    if (this.openBots.length == 0) {
        this.status = "PARTING";
        this.statusTime = this.network.CurrentTime();
        this.network.Part(this.name, function() {
            this.network.Log('PARTING from '+this.name+' @ '+this.network.name+' ...'); 
            this.SetTimeout();
        }.bind(this));
    }
};

/**
 *  Set timeout.
 */
Channel.prototype.SetTimeout = function()
{
    this.timeoutId = setTimeout(this.OnTimeout.bind(this), 60000);
};

/**
 *  Clear timeout.
 */
Channel.prototype.ClearTimeout = function()
{
    clearTimeout(this.timeoutId);
};

/**
 *  On timeout.
 */
Channel.prototype.OnTimeout = function()
{
    this.network.Log('!!! TIMEOUT '+this.status+' on channel '+this.name+' @ '+this.network.name+' !!!');
    this.network.ScoutChannels(this);
};

/**
 *  Send network status.
 */
Channel.prototype.SendStatus = function(res)
{
    res.write("    Channel "+this.name+' '+this.status+' at '+this.network.FormatTime(this.statusTime)+'<br/>');
    this.openBots.forEach(function(bot) {
        bot.SendStatus(res);
    });
}

/**
 *  export class
 */
module.exports = Channel;

/********************/
/* Channel.js : EOF */
/********************/

