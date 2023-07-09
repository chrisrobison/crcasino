var bj = {
    config: {
		  cloudURL: "https://us-central1-crblackjack-9e220.cloudfunctions.net/",
        maxBet: 500,
        minBet: 1,
        insurancePays:2,
        bjPays:2.5,
        soft17: "hit",
        split: true,
        splitSplits: false,
        splitSplitCount: 3,
        doubledown: "any", // "10or11", "any", "none"
        doubleAfterSplit: true,
        maxHandSize: 8
    },
    shoe: [],
    selectedChip: 1,
    playerCount: 0,
    players: {},
    counted: false,
    delay: 250,
    table: document.getElementById('main'),
    init: function(decks, players) {
        var baseW = 1679;
        var baseH = 945;

        var scaleW = baseW / window.innerWidth;
        var scaleH = baseH / window.innerHeight;

        /*
        $$("wrapper").style.transform = "scale(" + scaleW + ")";
        
        window.onresize = function() {
            var scaleW = window.innerWidth / baseW;
            var scaleH = window.innerHeight / baseH;

            $$("wrapper").style.transform = "scaleX(" + scaleW + ") scaleY(" + scaleH + ")";
 
        }
        */

        $$("minbet").innerHTML = "$" + bj.config.minBet;
        $$("maxbet").innerHTML = "$" + bj.config.maxBet;

        var p = 0;

        bj.table = document.getElementById("main");
        bj.table.innerHTML = "<div id='highlight'></div>";
		  
        bj.decks = decks;
        bj.newShoe(decks);
        bj.players = {};
        bj.players.dealer = {
            cards: [],
            total: 0,
            blackjacks: 0,
            busted: 0
        };
        bj.playerCount = players;

        bj.makePlayer("Dealer");

        for (p = 0; p < players; p++) {
            bj.makePlayer("Player " + (p + 1));
        }
        var cb = document.querySelector('.cardback');
        if (cb) cb.classList.remove('cardback');
        bj.hideButton('dealButton');
        bj.hideButton('hitstay');
    },
    shoeUI: {
        decks: 1,
        cards: 52,
        maxHeight:159,
        maxWidth:162,
        maxTop:40,
        maxLeft:35,
        minHeight:92,
        minWidth:134,
        minTop:100,
        minLeft:22,
        decrHeightBy: 1.288, // (bj.shoeUI.maxHeight - bj.shoeUI.minHeight) / ((bj.shoeUI.cards - 5) * bj.shoeUI.decks),
        decrWidthBy: 0.674, //(bj.shoeUI.maxWidth - bj.shoeUI.minWidth) / ((bj.shoeUI.cards - 5) * bj.shoeUI.decks),
        incrTopBy: 1.153,
        incrLeftBy: -0.25,
        top:40,
        left:35,
        height:159,
        width:162
    },
    newShoe: function(decks) {
        var d = s = p = 0,
            c = 1,
            div, ste = ['H', 'D', 'S', 'C'];
        bj.shoe = [];

        for (; d < decks; d++) {
            for (; s < 4; s++) {
                for (; c < 14; c++) {
                    bj.shoe.push(c + ste[s]);
                }
                c = 1;
            }
            s = 0;
        }
        bj.shuffle(10);
        console.log(bj.shoe);

    },
    makePlayer: function(name) {
        var div, showname = name,
            name = name.replace(/\W/g, '').toLowerCase();
        bj.players[name] = {
            name: name,
            cards: [],
            total: 0,
            ui: document.getElementById(name),
            wins: 0,
            loses: 0,
            pushed: 0,
            blackjacks: 0,
            busted: 0,
            bank: 1000,
            bet: 0,
            chips: [],
            isBusted: false
        };

        if (!bj.players[name].ui) {
            div = document.createElement("div");
            div.id = name;
            div.className = "hand";
            div.innerHTML = "<span class='betchips' id='"+name+"-chips'></span><span class='bet' id='" + name + "-bet'>0</span><span class='total' id='" + name + "-total'></span><span class='click'></span><div class='info'><img class='profilePic'><h1>" + showname + "</h1><span class='bank'>"+bj.players[name].bank+"</span></div>";
            
            var d2 = document.createElement('div');
            
            d2.className = "hands";
            d2.id = name + "-hands";

            div.appendChild(d2);

            bj.table.appendChild(div);
            bj.players[name].ui = div;

        } else {
            div = bj.players[name].ui;
        }

        return bj.players[name];
    },
    clearTable: function() {
        var oldcards = document.getElementsByClassName("card"),
            splits = $$$('.splitting'),
            tots = $$$('.total'),
            splittots = [$$$('.splittotal'), $$$('.splithand'), $$$('.splitresults'), $$$('.splitbet'), $$$('.splitchips')],
            i;
       console.dir(splittots); 
    
       if (tots.length) {
         for (var i=0; i<tots.length; i++) {
            tots[i].innerHTML = "";
         }
       }
        if (splittots.length) {
            for (var i=0; i<splittots.length; i++) {
                var list = splittots[i];
                if (list.length) {
                    for (var a=0; a<list.length; a++) {
                        list[a].parentNode.removeChild(list[a]);
                    }
                }
            }
        }
        if (splits) {
            for (var i=0; i<splits.length; i++ ) {
                splits[i].classList.remove('splitting');
            }
        }
        if (oldcards.length) {
            while (i = oldcards[0]) {
                if (oldcards[0].parentNode) {
                    oldcards[0].parentNode.removeChild(oldcards[0]);
                }
            }
        }
        for (i in bj.players) {
            if (bj.players.hasOwnProperty(i)) {
                bj.players[i].cards = [];
            }
        }
        bj.remove(".results");
        bj.remove(".busted");
        var hole = $$("holecard");
        if (hole) {
         hole.parentNode.removeChild(hole);
        }
    },
    remove: function(str) {
        var todie = $$$(str);
        console.dir(todie);
        if (todie) {
            for (var i = 0; i < todie.length; i++) {
                todie[i].parentNode && todie[i].parentNode.removeChild(todie[i]);
            }
        }
    },
    shuffle: function(cnt) {
        var j, x, i, cnt = cnt ? cnt : 1;
        while (cnt > 0) {
            for (i = bj.shoe.length; i; j = Math.floor(Math.random() * i), x = bj.shoe[--i], bj.shoe[i] = bj.shoe[j], bj.shoe[j] = x);
            cnt--;
        }
        bj.shoeUI.height = bj.shoeUI.maxHeight;
        bj.shoeUI.width = bj.shoeUI.maxWidth;
        bj.shoeUI.top = bj.shoeUI.maxTop;
        bj.shoeUI.left = bj.shoeUI.maxLeft;
        
        var c = $$("shoecards");
        c.style.height = bj.shoeUI.height + 'px';
        c.style.width = bj.shoeUI.width + 'px';
        c.style.top = bj.shoeUI.top + 'px';
        c.style.left = bj.shoeUI.left + 'px';

    },
    nextCard: function() {
        var c = $$("shoecards");
        bj.shoeUI.height -= bj.shoeUI.decrHeightBy;
        bj.shoeUI.width -= bj.shoeUI.decrWidthBy;
        bj.shoeUI.top += bj.shoeUI.incrTopBy;
        bj.shoeUI.left += bj.shoeUI.incrLeftBy;
        
        c.style.height = bj.shoeUI.height + 'px';
        c.style.width = bj.shoeUI.width + 'px';
        c.style.top = bj.shoeUI.top + 'px';
        c.style.left = bj.shoeUI.left + 'px';

        return bj.shoe.shift();
    },
    showCard: function(card, pl, idx, cardnum, hole=0, type='hands') {
        if (hole) {
           var holecard = document.createElement('div');
           holecard.id = 'holecard';
           holecard.classList.add('holecard');
           //holecard.classList.add('card');
           holecard.classList.add('undealt');
           var cardback = document.createElement('div');
           cardback.classList.add('cardback');
           holecard.appendChild(cardback);
        }
		  var uicard = $$(pl.name + "-card" + cardnum);
		  if (!uicard) {
				uicard = document.createElement("div");
			   uicard.className = "card undealt card-" + card.replace(/\W/, '');
			   var pic = document.createElement('div');
			   pic.className = 'pic';
			   uicard.appendChild(pic);
			   if (!hole) $$(pl.name + '-' + type).appendChild(uicard);
		  }
        if (cardnum===0) { uicard.style.marginTop = "0px"; }
        if (type === 'splithand') {
            uicard.id = pl.name + "-split" + cardnum; 
        } else {
            uicard.id = pl.name + "-card" + cardnum; 
        }

        if (!hole) {
         uicard.addEventListener("transitionend", function(event) {
            if (!uicard.done) {
                uicard.style.transform = "rotate(" + (Math.floor(Math.random() * 8) - 4) + "deg) translateX(" + (Math.floor(Math.random() * 8) - 4) + "px) translateY(" + (Math.floor(Math.random() * 8) - 4) + "px)";
                uicard.done = true;
            }
         });
        }

        if (hole) {
             uicard.classList.add('hole');
             uicard.classList.remove('undealt');
             uicard.classList.remove('undealt');
             holecard.appendChild(uicard);
             $$(pl.name + '-' + 'hands').appendChild(holecard);
             setTimeout(function() { uicard.classList.remove('undealt'); holecard.classList.remove('undealt'); }, (bj.delay * idx) + 250);
        } else {
             setTimeout(function() { uicard.classList.remove('undealt'); }, (bj.delay * idx) + 50);
        }

        return uicard;
    },
	 resetTable: function() {
        bj.clearTable();
        $$("chips").style.transform = "translateY(20em)";

        for (p = 1; p < bj.playerCount + 1; p++) {
            pl = bj.players["player" + p];
            pl.cards = [];
            pl.isBusted = false;
            pl.isSplitBusted = false;
            pl.splitting = 0;
            pl.splithand = [];
            pl.doubled = 0;
            pl.blackjack = 0;
            pl.splittotal = 0;
            pl.total = 0;
            $("#player" + p + " .bank").innerHTML = pl.bank;
            if (pl.bet > 0) {
               $("#player" + p + " .total").style.display = "inline-block";
               $("#player" + p + " .info").style.opacity = 1;
            } else {
               $("#player" + p + " .total").style.display = "none";
               $("#player" + p + " .info").style.opacity = 0.4;
            }
            $$("player"+p).classList.remove('LOSE');
            $$("player"+p).classList.remove('WIN');
            $$("player"+p).classList.remove('BUST');
        }
        bj.players.dealer.cards = [];
        bj.players.dealer.isBusted = false;
        bj.players.dealer.total = 0;
	 },
    deal: function() {
        var i, p, pl, card, uicard;
        bj.counted = false;
        bj.stopped = false;

        if (bj.shoe.length < ((bj.playerCount + 1) * 5)) {
            bj.newShoe(bj.decks);
        }

        bj.resetTable();
		  
		  var cnt = 0;

        for (i = 0; i < 2; i++) {
            for (p = 1; p < bj.playerCount + 1; p++) {
                pl = bj.players["player" + p];
                if (pl.bet > 0) {
                    card = bj.nextCard();
                    if (i===0) {
                        pl.bank -= pl.bet;
                        $("#player"+p+" .bank").innerHTML = pl.bank;
                    }
                    pl.cards.push(card);
                    var crd = bj.showCard(card, pl, cnt, i);
                    var ptot = bj.tallyCards("player" + p, cnt, (i===0?1:0));
                    console.log("Player " + p + " has " + ptot);
                    if (ptot == 21) {
                        bj.blackjack(pl);
                    }
                    ++cnt;
                }
            }
            card = bj.nextCard();

            if (i == 1) card = '*' + card;

            bj.players["dealer"].cards.push(card);
            var el = bj.showCard(card, bj.players["dealer"], cnt, i, i);
            // if (i == 1) el.classList.add("cardback");

            ptot = bj.tallyCards("dealer", cnt, (i===0?1:0));
            cnt += 2;
        }
        if (bj.checkBlackjack(bj.players["dealer"])) {
            bj.players['dealer'].blackjacks++;
            bj.currentPlayer = bj.playerCount;
            bj.revealHoleCard();
            
            setTimeout(function() {
                bj.tallyCards("dealer");
                bj.showResult('dealer', 'BLACKJACK', 'blackjack');
                bj.checkWinners();
            }, 2000);
        } else {
           bj.currentPlayerNumber = 0;
           bj.currentPlayer = "player1";
           bj.hideButton('dealButton', 300);
           bj.showButton('hitstay', 600);
           bj.nextPlayer();
        }
        //       setTimeout(function() { bj.play(); }, 3000 );
    },
    split: function() {
        bj.hideButton("splitButton");
        bj.hideButton("doubleButton");
        var p = bj.players[bj.currentPlayer];
        p.splitting = true;
        p.currentHand = 0;
        p.splithand = p.cards.splice(1, 1);

        st = el('span', bj.currentPlayer + '-splittotal', 'splittotal');
        st.classList.add('split');

        p.ui.appendChild(st);

        st = el('span', bj.currentPlayer + '-splitbet', 'bet', p.bet);
        st.classList.add('splitbet');
        p.ui.appendChild(st);

        st = $$(bj.currentPlayer + '-chips').cloneNode(true);
        st.id = bj.currentPlayer + '-splitchips';
        st.classList.add('splitchips');
        st.style.opacity = 1;

        p.ui.appendChild(st);
        
        p.ui.classList.add('splitting');
        var sel = document.createElement('div');
        sel.className = "splithand";
        sel.id = p.name + "-splithand";
        sel.style.opacity = 0.5;
        p.ui.appendChild(sel);

        var c2 = $$(p.name + "-card1");
        c2.id = p.name + "-split0";

        sel.appendChild(c2);

        var card = bj.nextCard();
        p.cards[1] = card;
        var ptot = bj.tallyCards(p.name);
    // showCard: function(card, pl, idx, cardnum, hole=0, type='hands') {
        bj.showCard(p.cards[1], p, 2, 1, 0, 'hands');
        
        if (bj.config.doubleAfterSplit && (bj.config.doubledown==='10or11' && ((ptot === 10) || (ptot ===11))) || (bj.config.doubledown==='any')) {
				bj.showButton('doubleButton');
			}
        
        card = bj.nextCard();
        p.splithand[1] = card;

        bj.showCard(p.splithand[1], p, 4, 1, 0, 'splithand');
        ptot = bj.tallySplit(p.name);
    },
    revealHoleCard: function() {
       bj.players.dealer.cards[1] = bj.players.dealer.cards[1].replace(/\W/g, '');
       $$('holecard').style.transform = "rotateY(180deg)";
       bj.tallyCards("dealer");
    },
    showButton: function(who, delay = 10) {
        var el = document.getElementById(who);
        if (el) {
            setTimeout(function() {
                el.classList.remove('hideButton'); //style.transform = "translateY(0%)";
                el.classList.add('showButton'); //style.transform = "translateY(0%)";
            }, delay);
        }
    },
    hideButton: function(who, delay) {
        var el = document.getElementById(who);
        if (el) {
            setTimeout(function() {
                el.classList.remove('showButton'); //style.transform = "translateY(125%)";
                el.classList.add('hideButton'); //style.transform = "translateY(125%)";
            }, delay);
        }
    },
    checkBlackjack: function(player) {
      var c1 = parseInt(player.cards[0]);
      var c2 = parseInt(player.cards[1].replace(/\W/g, ''));
      
      console.log("Checking blackjack for " + player['name']);
      console.log("Preparse:  Card 1: "+c1+" Card 2: "+c2);
      if (c1 > 10) c1 = 10;
      if (c2 > 10) c2 = 10;
      if (c1 === 1) c1 = 11;
      if (c2 === 1) c2 = 11;
      console.log("Postparse:  Card 1: "+c1+" Card 2: "+c2);
      console.log("Total: " + (c1 + c2));
		if (c1 + c2 === 21) { console.log(player.name + " has BLACKJACK!"); }
      return (c1+c2===21);
    },
    blackjack: function(player) {
        if (!player.blackjacks) player.blackjacks = 0;
        player.blackjacks++;
        player.win = player.bet + (player.bet * 1.5);
        player.wins += 2.5;
        player.blackjack = true;
        setTimeout(function() { bj.showResult(player.name, "BLACKJACK", 'blackjack'); }, 2000);
    },
    hit: function() {
        var card = bj.nextCard();
        var p = bj.players[bj.currentPlayer];
        bj.hideButton('splitButton');
        if (p.splitting) {
            if (p.cards.length > 6) { 
                if (p.currentHand===1) {
                    $$(p.name + "-hands").style.width = "9em"; 
                } else {
                    $$(p.name + "-splithand").style.width = "9em";
                }
            }
        } 
        
        if (p.splitting && p.currentHand===1) {
            p.splithand.push(card);
            bj.showCard(card, p, 0, p.cards.length - 1, 0, 'splithand');
            var ptot = bj.tallySplit(bj.currentPlayer);
            if (ptot > 21) {
                p.isSplitBusted = true;
                bj.nextPlayer();
                return false;
            } else if (ptot === 21) {
                bj.nextPlayer();
                return false;
            }

        } else {
            p.cards.push(card);
            bj.showCard(card, p, 0, p.cards.length - 1);
            var ptot = bj.tallyCards(bj.currentPlayer);
            if (ptot > 21) {
                p.isBusted = true;
                bj.nextPlayer();
                return false;
            } else if (ptot === 21) {
                bj.nextPlayer();
                return false;
            }
        }
        return true;
    },
    doubledown: function() {
        var p = bj.players[bj.currentPlayer];
        if (p.splitting) {
            if (p.currentHand===1) {
                p.splitDoubled = 1;
                p.bank -= p.splitBet;
                p.splitBet = p.splitBet * 2;
            } else {
                p.doubled = 1;
                p.bank -= p.bet;
                p.bet = p.bet * 2;
            }
        } else {
            p.bank -= p.bet;
            p.bet = p.bet * 2;
            p.doubled = 1;
        }
        bj.updateBet(bj.currentPlayer);
        if (bj.hit()) {
            bj.nextPlayer();
        }
    },
    updateBet: function(player) {
        $$(player + '-bet').innerHTML = bj.players[player].bet;
        $("#" + player + ' .bank').innerHTML = bj.players[player].bank;
    },
    play: function(cnt = 1) {
        var tot, ace, card, p = bj.players[bj.currentPlayer];

        tot = bj.getTotal(bj.currentPlayer);

        if ((tot > 21) || (tot > 16 && tot < 22)) {
            setTimeout(function() {
                bj.nextPlayer(cnt);
            }, (cnt * bj.delay) + 1000);
            return false;
        }

        while (((tot < 17) && (parseInt(bj.players.dealer.cards[0]) > 6)) || (tot < 12)) {
            card = bj.nextCard();
            p.cards.push(card);
            bj.showCard(card, p, cnt, p.cards.length - 1);
            bj.tallyCards(bj.currentPlayer);
            tot = bj.getTotal(bj.currentPlayer);
        }
        setTimeout(function() {
            bj.nextPlayer(cnt);
        }, (cnt * bj.delay) + 500);

        // if (bj.currentPlayer != "dealer") { setTimeout(function() { bj.play(cnt+1); }, (cnt*bj.delay) + 500); } 
    },
    playDealer: function() {
        var tot, ace, card, p = bj.players.dealer;

        tot = bj.getTotal('dealer');
        delay = 0;
        while (tot < 17) {
            if (tot < 17) {
                card = bj.nextCard();
                p.cards.push(card);
                bj.showCard(card, p, delay, p.cards.length - 1);
                tot = bj.tallyCards(bj.currentPlayer);
                ++delay;
            }
        }

        setTimeout(function() { bj.checkWinners(); }, delay * 300);
    },
    getTotal: function(pl) {
        var tot, ace, card, p = bj.players[pl],
            ac = (typeof p.total === "number") ? 0 : p.total.indexOf("/");

        if (ac) {
            ace = 1;
            tot = p.total.substring(p.total.indexOf("/") + 1, p.total.length);
        } else {
            ace = 0;
            tot = p.total;
        }

        return tot;
    },
    clearClass: function(className) {
        className = className.replace(/^\./, '');
        var els = document.querySelectorAll('.' + className);
        for (let el of els) {
            el.classList.remove(className);
        }
        return els;
    },
    nextPlayer: function() {
        var p = bj.players[bj.currentPlayer];
        if (p.splitting) {
           if (p.currentHand === 0) {
              p.currentHand = 1;
              $$(p.name + '-hands').style.opacity = 0.5;
              $$(p.name + '-splithand').style.opacity = 1;
              return;
           } else if (p.currentHand === 1) {
              $$(p.name + '-hands').style.opacity = 1;
              $$(p.name + '-splithand').style.opacity = 1;
           }
        }
        bj.players[bj.currentPlayer].ui.style.color = "#fff";
        bj.clearClass("currentPlayer");
        bj.hideButton('doubleButton');
        bj.hideButton('splitButton');

        bj.currentPlayerNumber++;
        if ((bj.currentPlayerNumber > 1) && (bj.currentPlayerNumber < bj.playerCount)) bj.tallyCards("player"+bj.currentPlayerNumber, 0, 0);
        if (bj.currentPlayerNumber > bj.playerCount) {
            bj.currentPlayer = "dealer";
            bj.players.dealer.cards[1] = bj.players.dealer.cards[1].replace(/\W/g, '');
            $$('holecard').style.transform = "rotateY(180deg)";
            bj.tallyCards("dealer");
            setTimeout(function() {
                bj.playDealer();
            }, bj.delay + 250);
        } else {
            bj.currentPlayer = "player" + bj.currentPlayerNumber;
            if (bj.players[bj.currentPlayer].bet == 0) {
                bj.nextPlayer();
                return;
            }
            var ptot = bj.tallyCards(bj.currentPlayer, 0, 0);
            if (bj.config.doubledown==='any' || (bj.config.doubledown==="10or11" && ((ptot===10) || (ptot===11)))) {
                bj.showButton('doubleButton');
            }
            if (ptot == 21) {
               bj.nextPlayer();
            }
            var c1 = parseInt(bj.players[bj.currentPlayer].cards[0]);
            var c2 = parseInt(bj.players[bj.currentPlayer].cards[1]); 
            if (c1 == c2) {
               bj.showButton('splitButton');
            }

            //             bj.play();
        }
        bj.players[bj.currentPlayer].ui.classList.add("currentPlayer");
        bj.players[bj.currentPlayer].ui.style.color = "#ff0";
    },
    count: function(cards) {
        var cc, cv, cnt = 0,
            c, ace = 0;
        cc = cards.length;
        for (c = 0; c < cc; c++) {
            if (cards[c].indexOf("*") < 0) {
                cv = parseInt(cards[c]);
                if (cv > 10) cv = 10;
                if (cv === 1) {
                    if (cnt + 11 <= 21) {
                        ace = 10;
                    }
                }
                cnt += cv;
            }
        }
        return [cnt, ace];
    },
    checkWinners: function() {
        if (bj.counted) return false;
        
        var hl = $('.currentPlayer');
        if (hl) hl.classList.remove('currentPlayer');
        var p, pl, dt = bj.getTotal("dealer"),
            dl = bj.players["dealer"];

        for (p = 1; p < bj.playerCount + 1; p++) {
            pl = bj.players["player" + p];
            if (pl.bet > 0) {
                if (pl.splitting) {
                    var ptot = bj.tallySplit("player" + p);
                    
                    if (!pl.isSplitBusted && ((dt > 21) || (dt < ptot))) {
                        bj.showSplitResult("player" + p, "WINNER", "winner");
                        pl.wins++;
                        pl.bank += pl.bet * 2;
                        if (pl.splitDoubled) {
                           pl.wins++;
                           pl.bank += pl.bet * 2;
                           pl.splitDoubled = false;
                        }
                    } else if (dt == ptot) {
                        bj.showSplitResult("player" + p, "PUSH", 'pusher');
                        pl.pushed++;
                        $$('player'+p+'-splittotal').style.borderColor = "#ccc";
                        $$('player'+p+'-splittotal').style.color = "#ccc";
                    } else {
                        if (!pl.isSplitBusted) bj.showSplitResult("player" + p, "LOST", 'loser');
                        pl.loses++;
                        
                        if (pl.splitDoubled) {
                            pl.loses++;
                            pl.splitDoubled = false;
                        }
                        $$('player'+p+'-splittotal').style.borderColor = "#f00";
                        $$('player'+p+'-splittotal').style.color = "#f00";
                    }
                    $("#player"+p+" .bank").innerHTML = pl.bank;
                }
                
                var ptot = bj.tallyCards("player" + p);
                
                if (!pl.isBusted && ((dt > 21) || (dt < bj.getTotal("player" + p))) || pl.blackjack) {
                    bj.showResult("player" + p, "WINNER", "winner");
                    pl.wins++;
                    pl.bank += pl.bet * 2;
                    if (pl.doubled) {
                       pl.wins++;
                       pl.bank += pl.bet;
                       pl.doubled = false;
                    }
                    $$('player'+p).classList.add('WIN');
                    if (pl.blackjack) {
                       pl.wins += 1.5; // TODO: change to bet value once bets implemented
                       pl.bank += (pl.bet / 2);
                       pl.blackjack = false;
                       $$('player'+p+'-results').classList.remove('blackjack');
                       $$('player'+p+'-total').style.borderColor = "#fff";
                       $$('player'+p+'-total').style.color = "#fff";
                       $$('player'+p).classList.add('WIN');
                    }
                    $$('player'+p+'-results').classList.add('throb');
                    bj.winChips("player" + p);
                } else if (dt == bj.getTotal("player" + p) && !pl.isBusted) {
                    bj.showResult("player" + p, "PUSH", 'pusher');
                    pl.pushed++;
                    pl.bank += pl.bet;
                    $$('player'+p+'-total').style.borderColor = "#ccc";
                    $$('player'+p+'-total').style.color = "#ccc";
                    $$('player'+p).classList.add('PUSH');
                } else {
                    if (!pl.isBusted) bj.showResult("player" + p, "LOST", 'loser');
                    pl.loses++;
                    if (pl.doubled) {
                        pl.loses++;
                        pl.doubled = false;
                        pl.bet = pl.bet / 2;
                    }
                    $$('player'+p+'-total').style.borderColor = "#aaa";
                    $$('player'+p+'-total').style.color = "#aaa";
                    $$('player'+p).classList.add('LOSE');
                    $$('player'+p+'-chips').classList.add('take');
                    bj.rebet('player'+p);

                }
                $("#player"+p+" .bank").innerHTML = pl.bank;
            }
        }
        bj.counted = true;
        bj.hideButton('hitstay');
        bj.hideButton('doubleButton');
        bj.hideButton('splitButton');
        bj.showButton('dealButton', 500);
        setTimeout(function() { bj.leaderboard(); }, 2000);
        setTimeout(function() {
            var rset = $$$(".busted");
            for (var i=0; i<rset.length; i++) {
                rset[i].style.transition = "all 5s ease-in";
                rset[i].style.opacity = 0;
                rset[i].style.transform = "scale(5)";
            }
            var rset = $$$(".results");
            for (var i=0; i<rset.length; i++) {
                rset[i].style.transition = "all 5s ease-in";
                rset[i].style.opacity = 0;
                rset[i].style.transform = "scale(5)";
            }
            var sset = $$$(".splitresults");
            for (var i=0; i<sset.length; i++) {
                sset[i].style.opacity = 0;
            }

        }, 5000);
        $$("chips").style.transform = "translateY(0em)";
         //       if (!bj.stopped) setTimeout(function() { bj.deal(); }, 3000);
    },
    winChips: function(player) {
        var winchips = $$(player+"-chips").cloneNode(true);
        winchips.style.filter = "brightness(2.0)";
        winchips.style.transitionDuration = "2s";

        winchips.id = player + "-winchips";
        winchips.style.top = "0%";
        winchips.style.left = "40%";
        winchips.style.opacity = 1;
        $$("main").appendChild(winchips);
        var left = "50%";
        switch (player) {
            case "player5":
                left = "0%";
                break;
            case "player4":
                left = "16%";
                break;
            case "player3":
                left = "38%";
                break;
            case "player2":
                left = "57%";
                break;
            case "player1":
                left = "76%";
                break;
        }
        console.log(player + " won chips. sending to: " +left);
        setTimeout(function() { winchips.style.top = "100%"; winchips.style.left = left; }, 500);
        //setTimeout(function() { $$('main').removeChild(winchips); }, 4000);
    },
	 bet: function(player, amt) {
		 var denoms = [100, 25, 5, 1];
       var runningTotal = amt;
		 var chips = [$$('chip100').cloneNode(true), $$('chip25').cloneNode(true), $$('chip5').cloneNode(true), $$('chip1').cloneNode(true)];
		 var stack = [];
		 var match = player.match(/player(\d)/);
		 var pn = parseInt(match[1]) - 3;

		 for (var i=0; i < denoms.length; i++) {
			 var denom = denoms[i];
			 
			 var chunks = Math.floor(runningTotal / denom);
			 if (chunks > 0) {
				 runningTotal -= chunks * denom;
				 for (var j=0; j < chunks; j++) {
					 var cloneChip = chips[i].cloneNode(true);
					 cloneChip.classList.remove('selected');
					 cloneChip.style.marginTop = -stack.length * 0.75 + "vh";
					 cloneChip.style.marginLeft = stack.length * (pn * -0.12) + "vw";
					 $$(player + "-chips").appendChild(cloneChip);
					 stack.push(cloneChip);
				 }
			 }
		 }
		 bj.players[player].chips = stack;
		 $$(player + "-bet").innerHTML = amt;
		 $$(player + "-bet").style.display = "inline-block";
		 $("#" + player + " .info").style.opacity = 1;
	 },
    rebet: function(player) {
        var pc = $$(player + "-chips");
        setTimeout(function() {
            pc.style.opacity = "0";
            pc.classList.remove('take');
            pc.style.transitionDuration = '0ms';
            
            setTimeout(function() { 
                pc.style.opacity = 1; 
                pc.style.transitionDuration = '2000ms';
                pc.classList.add('rebet'); 
                setTimeout(function() { pc.classList.remove("rebet"); }, 1000);
            }, 3000);
        }, 3000);
    },
    showSplitResult: function(player, result, classname) {
        var rdiv = document.getElementById(player + "-splitresults");

        if (!rdiv) {
           rdiv = document.createElement('span');
           rdiv.id = player + "-splitresults";
           rdiv.className = "splitresults";
           bj.players[player].ui.insertBefore(rdiv, $$(player + "-splithand"));
        }
        if (classname) {
           rdiv.classList.remove(classname);
           setTimeout(function() { rdiv.classList.add(classname); }, 100);
        }
        rdiv.innerHTML = result;
        
        rdiv.style.opacity = 1;
        rdiv.style.transform = "scale(1) rotate("+(Math.floor(Math.random()*10)-5)+"deg)";
        bj.players[player].result = result;
    },
    showResult: function(player, result, classname) {
        var rdiv = document.getElementById(player + "-results");

        if (!rdiv) {
           rdiv = document.createElement('span');
           rdiv.id = player + "-results";
           rdiv.className = "results";
           bj.players[player].ui.appendChild(rdiv);
        }
        if (classname) {
           rdiv.classList.remove(classname);
           setTimeout(function() { rdiv.classList.add(classname); }, 100);
        }
        rdiv.innerHTML = result;
        rdiv.style.opacity = 1;
        rdiv.style.transform = "scale(1) rotate("+(Math.floor(Math.random()*10)-5)+"deg)";
        
        
       bj.players[player].result = result;
        
        setTimeout(function() {
            bj.leaderboard();
        }, 2000);
    },
    leaderboard: function() {
        var html = '',
            p = 1,
            board = document.getElementById('leaderboard');

        html = "<tr><th>Player</th><th>Wins</th><th>Losses</th><th>Pushed</th><th>Busted</th><th>Blackjack</th><th>Total</th></tr>";
        for (var p in bj.players) {
            if (p !== "dealer") {
                if (bj.players.hasOwnProperty(p)) {
                    html += "<tr><td>" + p + "</td><td>" + bj.players[p].wins + "</td><td>" + bj.players[p].loses + "</td><td>" + bj.players[p].pushed + "</td><td>" + bj.players[p].busted + "</td><td>" + bj.players[p].blackjacks + "</td><td>" + (bj.players[p].wins - bj.players[p].loses) + "</td></tr>";
                }
            }
        }
        p = "dealer";
        html += "<tr><td>" + p + "</td><td></td><td></td><td>" + "</td><td>" + bj.players[p].busted + "</td><td>" + bj.players[p].blackjacks + "</td><td></td></tr>";
        board.innerHTML = html;
    },
    tallySplit: function(player) {
        var cnt;
        if (!player) player = bj.currentPlayer;
        cnt = bj.count(bj.players[player].splithand);
        if (cnt[1] && ((cnt[0] + cnt[1]) > 21)) cnt[1] = 0;
        var ptot = cnt[1] ? cnt[0] + cnt[1] : cnt[0];

        bj.players[player].splittotal = cnt[1] ? cnt[0] + "/" + (cnt[0] + cnt[1]) : cnt[0];
        
        var totel = document.getElementById(player + "-splittotal");
        totel.innerHTML = bj.players[player].splittotal;
        
        var r=255, g=255, b=255;
        if (ptot <= 21) { r = 0; g = 255; b = 0; }
        if (ptot < 17) { r = 255; g = 255; b = 0; }
        if (ptot < 12) { r = 0; g = 226; b = 255; }
        if (ptot > 21) { r = 190; g = 0; b = 0; }
        totel.style.color = "rgba(" + r + ", " + g + ", " + b + ", 1)";
        totel.style.borderColor = "rgba(" + r + ", " + g + ", " + b + ", 1)";

        console.log(player + " split total: " + bj.players[player].splittotal);
            
        if ((ptot > 21) && (!bj.players[player].isSplitBusted)) {
            var busted = document.createElement('span');
            busted.className = "busted";
            busted.innerHTML = "BUSTED";
            busted.style.marginTop = "2em";
            busted.style.marginLeft = "3em";
            bj.players[player].ui.insertBefore(busted, $$(player + '-splithand'));
            $$(player).classList.add('BUST');
            setTimeout(function() {
                busted.style.transform = "rotate(-30deg) scale(1)";
                busted.style.opacity = 1;
            }, 100);

            bj.players[player].isSplitBusted = true;
            bj.players[player].busted++;
        }
        return cnt[1] ? cnt[0] + cnt[1] : cnt[0];;
    }, 
    tallyCards: function(player, delay=1, firstOnly=0) {
        var cnt;
        if (!player) player = bj.currentPlayer;
        if ((bj.players[player].bet == 0) && (player!="dealer")) {
            return;
        }
        cnt = bj.count(bj.players[player].cards);
        if (cnt[1] && ((cnt[0] + cnt[1]) > 21)) cnt[1] = 0;
        var ptot = cnt[1] ? cnt[0] + cnt[1] : cnt[0];
        if (firstOnly) {
            ptot = parseInt(bj.players[player].cards[0]);
            if (ptot === 1) bj.players[player].total = '1/11';
            if (ptot > 10) ptot = 10;
            bj.players[player].total = ptot;
        } else {
            bj.players[player].total = cnt[1] ? cnt[0] + "/" + (cnt[0] + cnt[1]) : cnt[0];
        }
        
        var totel = document.getElementById(player + "-total");
        totel.style.display = "inline-block";
        setTimeout(function() { 
            totel.innerHTML = bj.players[player].total;
            
            var r=255, g=255, b=255;
            if (ptot <= 21) { r = 0; g = 255; b = 0; }
            if (ptot < 17) { r = 255; g = 255; b = 0; }
            if (ptot < 12) { r = 0; g = 226; b = 255; }
            if (ptot > 21) { r = 190; g = 0; b = 0; }
            totel.style.color = "rgba(" + r + ", " + g + ", " + b + ", 1)";
            totel.style.borderColor = "rgba(" + r + ", " + g + ", " + b + ", 1)";

            console.log(player + " total: " + bj.players[player].total);
        }, 300 * delay);
        if ((ptot > 21) && (!bj.players[player].isBusted)) {
            var busted = document.createElement('span');
            busted.className = "busted";
            busted.innerHTML = "BUSTED";
            busted.style.transition = "all 500ms linear";
            bj.players[player].isBusted = true;
            if (bj.players[player].splitting) {
                if (bj.players[player].currentHand === 0) {
                    busted.style.marginLeft = "-2em";
                    busted.style.marginTop = "1em";
                    busted.style.transition = "all 1000ms ease-in";
                    $$(player).insertBefore(busted, $$(player + '-hands'));
                    setTimeout(function() { 
                        busted.style.opacity = 1;
                        busted.style.transform = "rotate(-30deg) scale(1)";
                    }, 100);
                    bj.players[player].isBusted = true;
                } else {
                    $$(player).insertBefore(busted, $$(player + '-splithand'));
                    busted.style.opacity = 1;
                    busted.style.transform = "rotate(-30deg) scale(1)";
                }
            } else {
                bj.players[player].ui.appendChild(busted);
                bj.players[player].isBusted = true;
                setTimeout(function() {
                    busted.style.opacity = 1;
                    busted.style.transform = "rotate(-30deg) scale(1)";
                },100);
            }
            bj.players[player].busted++;
        }
        return cnt[1] ? cnt[0] + cnt[1] : cnt[0];;
    },
	 login: function() {
		var provider = new firebase.auth.FacebookAuthProvider();
		firebase.auth().signInWithPopup(provider).then(function(result) {
			// This gives you a Facebook Access Token. You can use it to access the Facebook API.
			var token = result.credential.accessToken;
			
			// The signed-in user info.
			var user = result.user;
		}).catch(function(error) {
			// Handle Errors here.
			var errorCode = error.code;
			var errorMessage = error.message;
			
			// The email of the user's account used.
			var email = error.email;
			// The firebase.auth.AuthCredential type that was used.
			var credential = error.credential;
	  });
	 }, 
	 joinTable: function(uid) {
		 var scr = el("script");
		 scr.src = bj.config.cloudURL + "joinTable?callback=bj.gotSeat&table=1&uid=" + firebase.auth().currentUser.uid;
		 document.body.appendChild(scr);
	 },
	 displayCard: function(obj, sequence) {
		 var pl = bj.players[obj.player];
		 if (sequence!==0 && !sequence) {
			sequence = pl.cards.length;
		 }
		 if (!pl.cards.includes(obj.card)) {
			 pl.cards.push(obj.card);
			 bj.showCard(obj.card, bj.players[obj.player], 0, pl.cards.length);
			 bj.tallyCards(obj.player);
		 }
	 },
	 gotSeat: function(obj) {
		 console.log("gotSeat: " + JSON.stringify(obj));
		 console.dir(obj);
		 bj.me.seat = parseInt(obj.seat);
		 firebase.database().ref("tables/"+obj.table+"/actions/" + firebase.auth().currentUser.uid).on("value", function(snap) {
			 snap.forEach(function(childSnapshot) {
			     var childKey = childSnapshot.key;
				  var actions = childSnapshot.val();
				  console.log("[gotSeat] received action: "+JSON.stringify(actions));
				  console.dir(actions);
				  if (actions && actions.action && actions.payload) {
				     if (bj[actions.action] && typeof(bj[actions.action]) == "function") {
                            bj[actions.action](actions.payload);
                     }
				     firebase.database().ref("tables/"+obj.table+"/actions/" + firebase.auth().currentUser.uid + "/" + childKey).remove()
				  }
			 });
		 });
		 firebase.database().ref("tables/"+obj.table+"/currentSeat").on("value", function(snap) {
			 var currentSeat = snap.val();
			 bj.currentSeat = currentSeat;
			 if (currentSeat) {
				bj.nextSeat(currentSeat);
				 if (bj.me.seat === currentSeat) {
					 bj.showButton("hitstay");
					 bj.showButton("doubleButton");
					 bj.hideButton("splitButton");
				 }
			}
		 });
		 bj.tableID = obj.table;
		 bj.db = obj;
		 if (bj.db.game.currentSeat==0) {
			bj.showButton("dealButton");
		 } else {
			bj.hideButton("dealButton");
		 }
		 bj.me.playerNum = obj.seat;
		 bj.me.player = "player" + obj.seat;
		 bj.makePlayer("Dealer");
		 
		 for (var i in obj.game.players) {
			if (obj.game.players.hasOwnProperty(i)) {
				 bj.playerJoined(obj.game.players[i]);
				 var cards = obj.game.players[i].cards[0];
				 if (cards.hand) {
					var keys = Object.keys(cards.hand);
					for (var j=0; j < keys.length; j++) {
						var card = (cards.hand && cards.hand[j]) ? cards.hand[j] : "";
						 if (card) {
							bj.displayCard({"player":"player"+obj.game.players[i].seat, "card":card, "sequence":j });	
						}
					 }
				 } 
			 }
		 }
		 //bj.displayCard({"player":"dealer", "card": obj.game.dealer.cards.hand[0]},0);
	    // showCard: function(card, pl, idx, cardnum, hole=0, type='hands') {
		 console.log("currentSeat: "+obj.game.currentSeat);
		 if (obj.game.currentSeat===0) {
			var dc = obj.game.dealer.cards.hand;
			for (var i=0; i< dc.length; i++) {
				bj.players['dealer'].cards.push(dc[i]);
				bj.showCard(dc[i], bj.players.dealer, 0, i, 0);
				bj.tallyCards("dealer", 0, 0);
			}
			bj.tallyCards("dealer", 0, 0);
		 } else {
			 bj.players['dealer'].cards.push(obj.game.dealer.cards.hand[0]);
			 bj.players['dealer'].cards.push(obj.game.dealer.cards.hand[1]);
			 bj.showCard(obj.game.dealer.cards.hand[0], bj.players.dealer, 0, 0, 0);
			 bj.showCard(obj.game.dealer.cards.hand[1], bj.players.dealer, 0, 1, 1);
			 bj.tallyCards("dealer", 0, 1);
		 }
	 },
	 playerJoined: function(obj) {
		if (obj) {
			var key = "player" + obj.seat;
			bj.players[key].info = obj;
			bj.players[key].name = "player" + obj.seat;
			bj.players[key].player = "player" + obj.seat;
			bj.players[key].bet = obj.bet;
			bj.players[key].profilePic = obj.profile_picture;
			bj.players[key].cards = [];

			$$(key).classList.add('active');
			if (obj && obj.info && obj.info.name) {
                    $("#" + key + " .info h1").innerHTML = obj.info.name;
            }
			if (obj && obj.info && obj.info.profile_picture) {
			    $("#" + key + " .profilePic").src = obj.info.profile_picture;
            } else {
			    $("#" + key + " .profilePic").src = "img/anonymous.gif";
            }
			$("#" + key + " .info .bank").innerHTML = "";
			$("#" + key + " .click").innerHTML = "";
			
			if (obj.bet) {
				bj.bet(key, obj.bet);
			}
		}
	 },
	 placeBet: function(amt) {
		 var scr = el("script");
		 scr.src = bj.config.cloudURL + "bet?callback=bj.betMade&bet=" + amt + "&table=" + bj.tableID + "&uid=" + firebase.auth().currentUser.uid;
		 document.body.appendChild(scr);
	 },
	 betMade: function(obj) {
		console.log("betMade: "+JSON.stringify(obj));
		console.dir(obj);
			
	 },
	 dealCards: function() {
		 var scr = el("script");
		 scr.src = bj.config.cloudURL + "deal?callback=bj.startPlaying&table=" + bj.tableID + "&uid=" + firebase.auth().currentUser.uid;
		 document.body.appendChild(scr);
		 bj.hideButton("dealButton");
	 },
	 doHit: function() {
		clearTimeout(bj.playerCountdownTimeout);
		$$("playerCountdown").classList.remove("show");
	
		if (bj.currentSeat === bj.me.seat) {
		   $$("playerTimer").innerHTML = "0:10 seconds";
		   bj.playerTimer = 10;
			var scr = el("script");
			scr.src = bj.config.cloudURL + "hit?callback=bj.gotHit&table=" + bj.tableID + "&uid=" + firebase.auth().currentUser.uid;
			document.body.appendChild(scr);
			bj.hideButton("splitButton");
			bj.hideButton("doubleButton");
		}
	 },
	 gotHit: function(obj) {
		console.log("gotHit: " + JSON.stringify(obj));
		console.dir(obj);
		 var pl = bj.players[obj.player];
		 clearTimeout(bj.playerCountdownTimeout);
	    bj.playerCountdownTimeout = 0;
		 $$("playerCountdown").classList.remove("show");

		 $$("playerTimer").innerHTML = "0:10 seconds";
		 bj.playerTimer = 10;
		 setTimeout(function() { $$("playerCountdown").classList.add("show");}, 100);
		 if (!bj.playerCountdownTimeout) {
			bj.playerCountdownTimeout = setTimeout(bj.updatePlayerCountdown, 1000);
		 }
		 
		 if (!pl.cards.includes(obj.card)) {
			 pl.cards.push(obj.card);
			 bj.showCard(obj.card, pl, 0, pl.cards.length);
			 bj.tallyCards(obj.player, 0);
		 }
	 },
	 startPlaying: function(obj) {
		console.log("startPlaying: "+JSON.stringify(obj));
		console.dir(obj);
		
		var players = [], keys = [], seats = [], ids;
		bj.currentSeat = obj.currentSeat;

		ids = Object.keys(obj.players);
		for (var i in obj.players) {
			if (obj.players.hasOwnProperty(i)) {
				var pl = obj.players[i];
				pl.uid = i;
				players.push(pl);
				seats[pl.seat] = i;
			}
		}
		var sorted = players.sort(function(a, b) { return (a.seat > b.seat) ? 1 : ((b.seat > a.seat) ? -1 : 0);});

		var cnt = 0;
		for (var c=0; c < 2; c++) {
			for (var s=1; s < 6; s++) {
				var p = seats[s];
				if (p) {
					cnt++;
					var pl = obj.players[p];
					pl.name = "player" + pl.seat;
					var card = pl.cards[0].hand[c];
					bj.showCard(card, pl, cnt, c, 0);
					bj.players[pl.name].cards[c] = card;
					$$(pl.name+'-total').classList.remove('hide');
					bj.tallyCards("player" + pl.seat, 0);
				}
			}
			cnt++;
			if (c!==1) {
				bj.players['dealer'].cards[0] = obj.dealer.hand[c];
				bj.showCard(obj.dealer.hand[c], bj.players["dealer"], cnt, c, 0);
				bj.tallyCards('dealer', cnt, 1);
			} else {
				bj.players['dealer'].cards[1] = obj.dealer.hand[c];
				bj.showCard(card, bj.players["dealer"], cnt, c, 1);
			}
			cnt++;
	     // showCard: function(card, pl, idx, cardnum, hole=0, type='hands') {
		}
		bj.hideButton('splitButton');
		bj.showButton('hitstay');
		bj.nextSeat(bj.currentSeat);
	 },
	 doDealer: function(obj) {
			clearTimeout(bj.playerCountdownTimeout);
			bj.playerCountdownTimeout = 0;
			$$("playerCountdown").classList.remove("show");

			var hole = $$('holecard')
			if (hole) { 
				hole.style.transform = "rotateY(180deg)";
			}
			//bj.players["dealer"].cards = obj.hand;
			var cnt = 1;
			console.log("doDealer: " + JSON.stringify(obj));
			var keys = Object.keys(obj.hand);
			for (var i=2; i < keys.length; i++) {
				console.log("doDealer: showing card: " + obj.hand[i]);
				bj.players['dealer'].cards.push(obj.hand[i]);
				bj.showCard(obj.hand[i], bj.players['dealer'], 0, i, 0);
				cnt++;
			}
			bj.tallyCards('dealer', 0);
			
			for (var i in obj.results) {
				var result = obj.results[i].hands[0].result;
				var pl = "player" + bj.db.game.seats[i];

				if (result==="WIN") {
					bj.showResult(pl, "WIN", "winner");
					bj.winChips(pl);
				   $$(pl+'-total').style.borderColor = "#0f0";
               $$(pl+'-total').style.color = "#0f0";
               $$(pl).classList.add('WIN');
				} else if (result==="PUSH") {
					bj.showResult(pl, "PUSH", "pusher");
				   $$(pl+'-total').style.borderColor = "#aaa";
               $$(pl+'-total').style.color = "#aaa";
               $$(pl).classList.add('PUSH');
				} else if (result==="BUST") {
				   $$(pl+'-total').style.borderColor = "#a00";
               $$(pl+'-total').style.color = "#a00";
               $$(pl).classList.add('BUST');
				} else {
					bj.showResult(pl, "LOSE", "loser");
				   $$(pl+'-total').style.borderColor = "#aaa";
               $$(pl+'-total').style.color = "#aaa";
               $$(pl).classList.add('LOSE');
               $$(pl+'-chips').classList.add('take');
               bj.rebet(pl);
				}
			}
			setTimeout(bj.resetGame, 5000);
	 },
	 removeCard: function(el) {
		setTimeout(function() { 
			if (el && el.parentNode) el.parentNode.removeChild(el); 
		}, 1500);
	 },
	 resetGame: function() {
		 var cards = $$$(".card");
		 for (var i in cards) {
			  if (cards.hasOwnProperty(i)) {
					cards[i].style.transform = "";
					cards[i].style.transition = "all 1000ms linear";
					cards[i].classList.add('discarded');
					bj.removeCard(cards[i]);
			  }
		 }
		 var hole = $$("holecard");
		 if (hole) {
			hole.parentNode.removeChild($$("holecard"));
		 }

		 var results = $$$(".results");
		 for (var i in results) {
			 if (results.hasOwnProperty(i)) {
				 results[i].style.transform = "";
				 results[i].style.opacity = 0;
			 }
		 }
		 
		 var busted = $$$(".busted");
		 for (var i in busted) {
			 if (busted.hasOwnProperty(i)) {
				 busted[i].style.transform = "";
				 busted[i].style.opacity = 0;
			 }
		 }
		 
		 var totals = $$$(".total");
		 for (var i in totals) {
			 if (totals.hasOwnProperty(i)) {
				 totals[i].classList.add('hide');
			 }
		 }

		 var LOSES = $$$(".LOSE");
		 for (var i in LOSES) {
			 if (LOSES.hasOwnProperty(i)) {
				 LOSES[i].classList.remove('LOSE');
			 }
		 }

		 var WINS = $$$(".WIN");
		 for (var i in WINS) {
			 if (WINS.hasOwnProperty(i)) {
				 WINS[i].classList.remove('WIN');
			 }
		 }


		 $$("dealer-total").classList.remove('hide');
		 $$("highlight").style.display = "none";
		 bj.nextGameCountdown();

		 for (var i in bj.players) {
			if (bj.players.hasOwnProperty(i)) {
				bj.players[i].cards = [];
				$$(i+"-total").innerHTML = 0;
			}
		 }
		 bj.players['dealer'].cards = [];
	 },
	 nextGameCountdown: function() {
		bj.countdown = 10;
		$$("nextGameCountdown").classList.add('show');
		setTimeout(bj.updateCountdown, 1000);
		setTimeout(bj.dealCards, 10000);
	 },
	 updatePlayerCountdown: function() {
		bj.playerTimer--;
		var fmt = bj.playerTimer;
		if (fmt < 10) {
			fmt = "0" + fmt;
		}
		$$("playerTimer").innerHTML = "0:" + fmt + " seconds";
		
		if (bj.playerTimer > 0) {
			setTimeout(bj.updatePlayerCountdown, 1000);
		} else {
			$$("playerCountdown").classList.remove('show');
			bj.doStay();
		}
	 },
	 updateCountdown: function() {
		bj.countdown--;
		var fmt = bj.countdown;
		if (fmt < 10) {
			fmt = "0" + fmt;
		}
		$$("nextGameTimer").innerHTML = "0:" + fmt + " seconds";
		
		if (bj.countdown > 0) {
			setTimeout(bj.updateCountdown, 1000);
		} else {
			$$("nextGameCountdown").classList.remove('show');
		}
	 },
	 nextSeat: function(seat=bj.currentSeat) {
		 if (seat) {
			if (Number.isInteger(seat)) {
				bj.currentSeat = seat;
			   var pname = bj.db.game.players[bj.db.game.seats[seat]].info.name;
			   var plural = (pname.match(/s$/)) ? "'" : "'s";
			   $$("playerCountdownName").innerHTML = bj.me.displayName + plural;
				if (seat == bj.me.seat) {
				   $$("playerCountdownTagLine").innerHTML = "Make your move...";
				} else {
					$$("playerCountdownTagLine").innerHTML = pname + " is making their move...";
				}
			 } else {
			   $$("playerCountdownName").innerHTML = "Dealer's";
				$$("playerCountdownTagLine").innerHTML = "Dealer is playing..."; 
				bj.currentSeat = "dealer";
			 }
			 
		 } 
		 var id = (seat=="dealer") ? "dealer" : "player" + seat;
		 $$("highlight").style.display = "inline-block";
		 $$("highlight").className = id;
		 bj.currentPlayerNum = bj.currentSeat;
		 bj.currentPlayer = id;
		 
		 if (bj.me.seat === bj.currentSeat) {
			 bj.showButton("hitstay");
			 bj.showButton("doubleButton");
			 bj.hideButton("splitButton");
			 var pname = bj.me.displayName;
			 var plural = (pname.match(/s$/)) ? "'" : "'s";
			 $$("playerCountdownName").innerHTML = bj.me.displayName + plural;
		 }
		 bj.playerTimer = 10;
		 $$("playerTimer").innerHTML = "0:" + bj.playerTimer + " seconds";
		 $$("playerCountdown").classList.add("show");
	    if (!bj.playerCountdownTimeout) {
			bj.playerCountdownTimeout = setTimeout(bj.updatePlayerCountdown, 1000);
		 }
	 },
	 doStay: function() {
		clearTimeout(bj.playerCountdownTimeout);
		bj.playerCountdownTimeout = 0;
		$$("playerCountdown").classList.remove("show");

		if (bj.currentSeat === bj.me.seat) {
		 var scr = el('script');
		 scr.src = bj.config.cloudURL + "stay?callback=bj.nextSeat&table=" + bj.tableID + "&uid=" + bj.me.uid;
		 document.body.appendChild(scr);
		 bj.hideButton("hitstay");
		}
	 }
};
function el(tag, id='', classname='', content='') {
    var el = document.createElement(tag);
    if (id) el.id = id;
    if (classname) el.className = classname;
    if (content) el.innerHTML = content;
    return el;
}
function $$$(str) { return document.querySelectorAll(str); }
function $$(str) { return document.getElementById(str); }
function $(sel) { return document.querySelector(sel); }


document.addEventListener("DOMContentLoaded", function(event) { bj.init(1, 5); } );

