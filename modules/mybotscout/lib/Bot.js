/**********/
/* Bot.js */
/**********/

/**
 *  Costructor
 */
var Bot = function Bot(channel, name)
{
    this.channel = channel;
    this.name    = name;
    this.files   = [];
    this.status  = "LISTING";
    this.statusTime = this.channel.network.CurrentTime();
    this.channel.network.Say(this.name, "XDCC LIST",
        function() { this.channel.network.Log('LISTING files in '+this.name+' ! '+this.channel.name+' @ '+this.channel.network.name+' ...'); }.bind(this));
    this.channel.network.Say(this.name, "XDCC SEARCH roriwe"+new Date().getTime()+"dkadka",
        this.SetTimeout.bind(this));
//this.channel.ScoutBots(this);
};

/**
 *  notice event
 */
Bot.prototype.OnNotice = function(text, message)
{
    if (this.IsNotifyTryList(text)) {
        this.ClearTimeout();
        if (this.status == "LISTING") {
            this.status = "SEARCHING";
            this.statusTime = this.channel.network.CurrentTime();
            this.channel.network.Say(this.name, 'XDCC SEARCH *',
                function() { this.channel.network.Log('SEARCHING files in '+this.name+' ! '+this.channel.name+' @ '+this.channel.network.name+' ...'); }.bind(this));
            this.channel.network.Say(this.name, 'XDCC SEARCH roriwe'+new Date().getTime()+'dkadka',
                this.SetTimeout.bind(this));
        } else {
            this.status = null;
            this.statusTime = this.channel.network.CurrentTime();
//          this.channel.network.Log('FILES: ' + JSON.stringify(this.files));
            this.channel.network.Log('TOTAL '+this.files.length +' files in '+this.name+' ! '+this.channel.name+' @ '+this.channel.network.name+'.');
            if (!this.channel.network.debug && (this.files.length != 0))
                clearInterval(this.intervalId);
            this.channel.ScoutBots(this);
        }
        return;
    }
    if ((this.status == "LISTING"  ) || (this.status == "SEARCHING") || (this.status == "COLLECTING")) {
        var file = this.FileFromNotify(text);
        if (file != null) {
            this.ClearTimeout();
            if (this.status != "COLLECTING")
                this.status = "COLLECTING";
            this.statusTime = this.channel.network.CurrentTime();
            this.SetTimeout();
            this.channel.network.Debug('FILE: ' + JSON.stringify(file));
            if (!this.channel.network.debug && (this.files.length == 0)) {
                this.channel.network.Log('COLLECTING files in '+this.name+' ! '+this.channel.name+' @ '+this.channel.network.name+' ...');
                this.intervalId = setInterval(function() {
                    this.channel.network.Log('FOUND '+this.files.length +' files in '+this.name+' ! '+this.channel.name+' @ '+this.channel.network.name+' ...');
                }.bind(this), 60000);
            }
            this.files[this.files.length] = file;
            return;
        }
    }
    if (this.IsNotifyDummy(text) == false)
        this.channel.network.Log('NOTICE: ' + JSON.stringify(message));
};

/**
 *  Set timeout.
 */
Bot.prototype.SetTimeout = function()
{
    this.timeoutId = setTimeout(this.OnTimeout.bind(this), 60000);
};

/**
 *  Clear timeout.
 */
Bot.prototype.ClearTimeout = function()
{
    clearTimeout(this.timeoutId);
};

/**
 *  On timeout.
 */
Bot.prototype.OnTimeout = function()
{
    this.channel.network.Log('!!! TIMEOUT '+this.status+' files in bot '+this.name+' ! '+this.channel.name+' @ '+this.channel.network.name+' !!!');
    this.channel.ScoutBots(this);
};

/**
 *  Check if a notify text is a TRY LIST.
 */
Bot.prototype.IsNotifyTryList = function(text)
{
    /////////////// "Mi spiace, non ho trovato nulla. Prova con XDCC LIST"
    if (text.match(/^Mi spiace, non ho trovato nulla\. Prova con XDCC LIST$/))
        return true;
    /////////////// "Mi Dispiace, Non E' Stato Trovato Nulla, Riprova Con XDCC LIST"
    if (text.match(/^Mi Dispiace, Non E' Stato Trovato Nulla, Riprova Con XDCC LIST$/))
        return true;
    /////////////// "Mi Spiace, Non Ho Trovato Nulla. Visita La Lista."
    if (text.match(/^Mi Spiace, Non Ho Trovato Nulla\. Visita La Lista\.$/))
        return true;
    return false;
};

/**
 *  Parse a notify text to extract a file copy.
 */
Bot.prototype.FileFromNotify = function(text)
{
    ////////////////////// " - Pack #1 matches, \"CARTOON-Walt.Disney.Pocahontas.1995.iTALiAN.DVDrip.XviD_EMMA.crew.avi\""
    var match = text.match(/^ +- +Pack +#(\d+) +matches, +"([^"]+)"/);
    if (match) return {
        pack: match[1],
        name: match[2]
    };
    ///////////////////// "#17 3x [739M] 2014-03-22 18:59 Walt_Disney_-_Gli_Incredibili.Una_Normale_Famiglia_di_Super_eroi.(iTALiAN.HQ.Personal.XviD-SySTEM).avi"
    ///////////////////// "#26  4x [ <1k] 2014-09-11 11:10 Trilli.e.la.Nave.Pirata.2014.iTALiAN.BDRip.XviD-TRL.srt"
    match = text.match(/^ *#(\d+) +\d+x +\[([^\]]+)\] +(\d\d\d\d-\d\d-\d\d +\d\d:\d\d) +(.+)$/);
    if (match) return {
        pack: match[1],
        size: match[2],
        time: match[3],
        name: match[4]
    };
    ////////////////////// #1   33x [ 43M] Nero.Burning.ROM.E.Nero.Express.2015.v16.0.23.0.Portable.BmB.rar"
    match = text.match(/^ *#(\d+) +\d+x +\[([^\]]+)\] +(.+)$/);
    if (match) return {
        pack: match[1],
        size: match[2],
        name: match[3]
    };
    return null;
};

/**
 *  Check if a notify text is dummy.
 */
Bot.prototype.IsNotifyDummy = function(text)
{
    ////////////// "** XDCC LIST negata. Scrivi !list nel canale")
    ////////////// "** XDCC LIST negato, per richiedere questo pack, devi essere un un chan in cui ci sia anche io"
    if (text.match(/^\*\* +XDCC LIST +negat[ao].*$/))
        return true;
    ////////////// "Ricerca Per \"roriwedkadka\"..."
    if (text.match(/^(Sto cercando|Ricerca) +[pP]er +".+"\.\.\.$/))
        return true;
    ////////////// "** Per fermare questo listing, scrivi \"/MSG FOREVER|CARTONS|04 XDCC STOP\" **"
    ////////////// "** Per Fermare La Lista, Digita \"/MSG SKIpp3r|NaPoLi|19 XDCC STOP\" **"
    if (text.match(/^\*\* +Per +[fF]ermare +(questo +listing|La +Lista), +(scrivi|Digita) +"\/MSG +[^ ]+ +XDCC +STOP" +\*\*$/))
        return true;
    ////////////// "** 17 Packs **  5 di 5 Slots aperti, Min: 1.0kB/s, Max: 200.0kB/s, Record: 202.6kB/s"
    ////////////// "** 291 Packs **  3 di 3 Slots aperti, Max: 500.0kB/s, Record: 1878.8kB/s"
    ////////////// "** 29 File **  5 Di 5 Slot Aperti, Min: 50.0KB/s, Max: 300.0KB/s, Record: 240.8KB/s"
    ////////////// "** 0 File **  5 Di 5 Slot Aperti, Min: 50.0KB/s, Max: 300.0KB/s"
    ////////////// "** 1 pack **  5 di 5 Slots aperti, Min: 1.0kB/s, Max: 200.0kB/s, Record: 200.3kB/s"
    if (text.match(/^\*\* +\d+ +([Pp]ack(s|)|File) +\*\* +\d+ +[dD]i +\d+ +Slot(s|) +[aA]perti(, +Min: +[\d\.]+[kK]B\/s|), +Max: +[\d\.]+[kK]B\/s(, +Record: +[\d\.]+[kK]B\/s|)$/))
        return true;
    ////////////// "** Utilizzo Banda ** Attuale: 0.0kB/s, Record: 405.2kB/s"
    ////////////// "** Utilizzo Banda ** Attuale: 0.0KB/s, Record: 280.3KB/s"
    ////////////// "** Utilizzo Banda ** Attuale: 0.0KB/s,"
    if (text.match(/^\*\* +Utilizzo +Banda +\*\* +Attuale: +[\d\.]+[kK]B\/s,( +Record: +[\d\.]+[kK]B\/s|)$/))
        return true;
    ////////////// "** Per richiedere un file, scrivi \"/MSG FOREVER|WALTDISNEY|03 XDCC SEND x\" **"
    ////////////// "** Per Richiedere Un File, Digita \"/MSG SKIpp3r|LaTiNa|15 XDCC SEND x\" **"
    if (text.match(/^\*\* +Per +[rR]ichiedere +[uU]n +[fF]ile, +(scrivi|Digita) "\/MSG +[^ ]+ +XDCC +SEND +x" +\*\*$/))
        return true;
    ////////////// "** Per richiedere i dettagli, scrivi \"/MSG FOREVER|WALTDISNEY|03 XDCC INFO x\" **"
    ////////////// "** Per Richiedere Dettagli, Digita \"/MSG SKIpp3r|NaPoLi|19 XDCC INFO x\" **"
    if (text.match(/^\*\* +Per +[rR]ichiedere +(i +|)[dD]ettagli, +(scrivi|Digita) +"\/MSG +[^ ]+ +XDCC +INFO +x" +\*\*$/))
        return true;
    ////////////// "Totale offerto: 13GB  Totale trasferito: 68GB"
    ////////////// "Totale Offerto: 0B  Totale Trasferito: 0B"
    ////////////// "Totale offerto: 8.5GB  Totale trasferito: 366GB"
    ////////////// "Totale offerto: 114GB  Totale trasferito: 2.1TB"]
    if (text.match(/^Totale +[oO]fferto: +[\d\.]+([TGM]|)B +Totale +[tT]rasferito: +[\d\.]+([TGM]|)B$/))
        return true;
    ////////////// "** >>skipper�<< **"
    ////////////// "** Offerto da Cipio&Bursi **"
    if (text.match(/^\*\* +(Offerto +da +|)[^ ]+ +\*\*$/))
        return true;
    return false;
/*
"user":"Deekib0t","host":"ChLame-49312629.ip-94-23-55.eu","command":"NOTICE","rawCommand":"NOTICE","commandType":"normal","args":["yosot1432549243150mbtcu","** 0 File **  5 Di 5 Slot Aperti, Min: 50.0KB/s, Max: 300.0KB/s"]}
2015-05-25 06:31:58 (CEST) : NOTICE: {"prefix":"SKIpp3r|SeRiEsSuB|20!Deekib0t@ChLame-49312629.ip-94-23-55.eu","nick":"SKIpp3r|SeRiEsSuB|20","user":"Deekib0t","host":"ChLame-49312629.ip-94-23-55.eu","command":"NOTICE","rawCommand":"NOTICE","commandType":"normal","args":["yosot1432549243150mbtcu","** Utilizzo Banda ** Attuale: 0.0KB/s,"]}
*/
};

/**
 *  Send network status.
 */
Bot.prototype.SendStatus = function(res)
{
    res.write("        Bot "+this.name+' '+this.status+' founds '+this.files.length+' files at '+this.channel.network.FormatTime(this.statusTime)+'<br/>');
}

/**
 *  export class
 */
module.exports = Bot;

/****************/
/* Bot.js : EOF */
/****************/

