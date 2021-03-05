let firebase = require('firebase-admin');
let functions = require('firebase-functions');
firebase.initializeApp(functions.config().firebase);
let database = firebase.database();
let ref = database.ref('tables');
let Hand = require('pokersolver').Hand;
let paytables;

database.ref("payouts").once("value", function(snap) {
    paytables = snap.val();
});

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
exports.shuffle = functions.https.onRequest((request, response) => {
    // Grab and/or set the tableID and how many decks to return
    let table = request.query.table || 1;
    let decks = request.query.decks || 1;

    // If we have a table value...
    if (table) {
        let cards = []; // Array to store our cards into
        let suits = ['S', 'C', 'D', 'H']; // Array of suit identifiers

        // First loop over decks
        for (let j = 0; j < decks; j++) {
            // and then suits
            for (let s = 0; s < suits.length; s++) {
                // and finally card values
                for (let c = 0; c < 13; c++) {
                    cards.push((c + 1) + suits[s]);
                }
            }
        }

        // Shuffle array any number of times
        let j, x, i, cnt = Math.floor(Math.random() * 10) + 5;
        while (cnt > 0) {
            for (i = cards.length; i; j = Math.floor(Math.random() * i), x = cards[--i], cards[i] = cards[j], cards[j] = x);
            cnt--;
        }

        // Build updates array for cloud storage
        let updates = {};
        for (i = 0; i < (52 * decks); i++) {
            updates[table + '/shoe/' + i] = cards[i];
        }

        let out = {
            "deck": cards
        };

        ref.update(updates); // Send our new deck of cards to database
        response.status(200).send(out); // Return generated deck as JSON
    }
});

exports.nextCard = functions.https.onRequest((request, response) => {
    // Grab and/or set the tableID and how many decks to return
    let table = request.query.table || 1;

    if (table) {
        let out = {};
        let tableRef = ref.child(table);
        database.ref(`tables/${table}`).once('value').then(function(snap) {
            let shoe = snap.child('shoe').val();
            let card = shoe.splice(0, 1)[0];
            snap.set({
                "shoe": shoe
            });
            out.card = snap.val();
            response.status(200).send(out);
        });
    }
});

exports.collectBonus = functions.https.onRequest((request, response) => {
    //let uid = firebase.auth().currentUser.uid;
    let bank = database.ref("bank/");
    let uid = request.query.uid;
    let cb = request.query.callback;

    if (uid) {
        bank.child(uid).once('value', function(snapshot) {
            let user = snapshot.val();
            console.log(user);
            if (user) {
                let out = {
                    "balance": user.balance
                };
                if ((Date.now() - user.lastHourly) > 3600000) {
                    user.balance += 100;
                    out.balance += 100;
                    user.lastHourly = out.lastHourly = Date.now();
                    user.hourlyBonus = 100;
                }
                if ((Date.now() - user.lastDaily) > 86400000) {
                    user.balance += 1000;
                    out.balance += 1000;
                    user.lastDaily = out.lastDaily = Date.now();
                    user.dailyBonus = 1000;
                }

                bank.child(uid).update(out);
            } else {
                user = {
                    "lastHourly": Date.now(),
                    "lastDaily": Date.now(),
                    "balance": 1100
                };
                bank.child(uid).set(user);
            }

            response.status(200).send(cb + "(" + JSON.stringify(user) + ");");

        });
    }

});

exports.newGame = functions.https.onRequest((request, response) => {
    let game = request.query.game;
    let uid = request.query.uid;
    let bet = parseInt(request.query.bet);
    let cb = request.query.callback;
    let hands = request.query.hands || 1;

    if (game && uid) {
        if (game !== 'holdem') {
            let deck = makeDeck(1);
            let upd = {
                "hand": deck.splice(0, 5),
                "deck": deck,
                "uid": uid,
                "bet": bet
            };
            database.ref(`games/${game}/${uid}`).update(upd);
            database.ref(`bank/${uid}/balance`).once('value', function(snap) {
                let balance = snap.val();
                balance = balance - (bet * hands);
                database.ref(`bank/${uid}`).update({
                    "balance": balance
                });
            });
            response.status(200).send(cb + "(" + JSON.stringify(upd.hand) + ");");
        } else if (game === 'holdem') {
            let deck = makeDeck(1);
            let dealerCards = deck.splice(0, 2);
            let playerCards = deck.splice(0, 2);
            let riverCards = {};

            let upd = {
                "hand": deck.splice(0, 2),
                "dealer": dealerCards,
                "river": riverCards,
                "deck": deck,
                "uid": uid,
                "bet": bet,
                "pot": (bet * 2),
                "nextCard": 0
            };
            database.ref(`games/${game}/${uid}`).update(upd);
            database.ref(`bank/${uid}/balance`).once('value', function(snap) {
                let balance = snap.val();
                balance = balance - bet;
                database.ref(`bank/${uid}`).update({
                    "balance": balance
                });
            });
            response.status(200).send(cb + "(" + JSON.stringify(upd.hand) + ");");

        }
    }
});

exports.callBet = functions.https.onRequest((request, response) => {
    let gametype = request.query.game;
    let uid = request.query.uid;
    let cb = request.query.callback;

    if (gametype && uid) {
        anteUp(gametype, uid);
        database.ref(`games/${gametype}/${uid}`).once('value', function(snap) {
            let game = snap.val();
            database.ref(`bank/${uid}/balance`).once('value', function(snap) {
                let balance = snap.val();
                balance -= game.bet;
                database.ref(`bank/${uid}`).update({
                    "balance": balance
                });
            });
            game.pot += game.bet;
            database.ref(`games/${gametype}/${uid}`).update({
                "pot": game.pot
            });
            let deck = Array.from(game.deck);

            if (game.nextCard === 0) {
                let cards = deck.splice(0, 3);

                database.ref(`games/${gametype}/${uid}`).update({
                    "nextCard": 3,
                    "river": cards
                });
                let out = {
                    "river": cards,
                    "pot": game.pot
                };
                response.status(200).send(cb + '(' + JSON.stringify(out) + ');');
            } else if (game.nextCard < 5) {
                let card = deck.splice(0, 1);

                database.ref(`games/${gametype}/${uid}`).update({
                    "nextCard": game.nextCard + 1,
                    "deck": deck
                });

                let upd = {};
                upd[game.nextCard] = card[0];
                database.ref(`games/${gametype}/${uid}/river`).update(upd);
                let cardid = "card" + game.nextCard;
                let out = {};

                out.card = card[0];
                out.pot = game.pot;
                out.cardID = game.nextCard;

                response.status(200).send(cb + '(' + JSON.stringify(out) + ');');

            }

        });

    }
});

exports.exchangeCards = functions.https.onRequest((request, response) => {
    let gametype = request.query.game;
    let uid = request.query.uid;
    let cb = request.query.callback;
    let hands = request.query.hands || 1;

    let discard = request.query.discard;
    let discards = [];
    if (discard) discards = discard.split(/,/);

    if (gametype && uid) {
        let out = {
            "hands": [],
            "results": [],
            "wins": []
        };
        database.ref(`games/${gametype}/${uid}`).once('value', function(snapshot) {
            let game = snapshot.val();
            let deck = Array.from(game.deck);
            let upd = {
                "hand": game.hand,
                "hands": {},
                "results": [],
                "wins": []
            };
            let hand = Array.from(game.hand);
            let paytable = paytables[gametype].hands;
            let wintot = 0;
            for (let h = 0; h < hands; h++) {
                deck = reshuffle(deck); // Shuffle every time
                let newhand = hand.slice(); // Clone our hand
                console.log("base hand: " + JSON.stringify(newhand));

                // Replace discards with new cards
                for (let i = 0; i < discards.length; i++) {
                    newhand[discards[i]] = deck[i];
                }
                console.log("new hand: " + JSON.stringify(newhand));
                out.hands[h] = newhand;

                switch (gametype) {
                    case "dueces":
                        out.results[h] = checkDuecesHand(newhand);
                        break;
                    case "bonus":
                    case "doublebonus":
                        out.results[h] = checkBonusHand(newhand);
                        break;
                    default:
                        out.results[h] = checkPokerHand(newhand);
                        break;
                }

                let win = 0;
                if (out.results[h] && paytable[out.results[h]]) {
                    win = (paytable[out.results[h]] * game.bet);
                }
                wintot += win;
                out.wins[h] = win;
                upd.wins[h] = win;
                upd.hands[h] = newhand;
            }

            if (wintot > 0) {
                payout(uid, wintot);
            }
            upd.deck = game.deck;
            upd.state = "complete";
            console.log("update: " + JSON.stringify(upd));
            database.ref(`games/${gametype}/${uid}`).update(upd);
            console.log("sending out:" + JSON.stringify(out));
            response.status(200).send(cb + "(" + JSON.stringify(out) + ")");
        });
    } else {
        let upd = {
            "hands": hands
        };
        upd.state = "complete";
        database.ref(`games/${gametype}/${uid}`).update(upd);
        response.status(200).send(cb + '({"error":"Invalid game or uid"})');
    }
});

function buyin(uid, amount) {
    if (uid && amount) {
        database.ref(`bank/${uid}`).once('value', function(snapshot) {
            let bank = snapshot.val();
            bank.balance -= amount;
            console.log("[buyin] -$" + amount + " from " + uid + "; new total: " + bank.balance);
            database.ref(`bank/${uid}`).update({
                "balance": bank.balance
            });
        });
    }
}

function payout(uid, amount) {
    if (uid && amount) {
        database.ref(`bank/${uid}`).once('value', function(snapshot) {
            let bank = snapshot.val();
            bank.balance += amount;
            console.log("[payout] $" + amount + " to " + uid + "; new total: " + bank.balance);
            database.ref(`bank/${uid}`).update({
                "balance": bank.balance
            });
        });
    }
}

exports.checkHand = functions.https.onRequest((request, response) => {
    let gametype = request.query.game;
    let uid = request.query.uid;
    let cb = request.query.callback;

    if (gametype && uid) {
        database.ref(`games/${gametype}/${uid}`).once('value', function(snapshot) {
            let game = snapshot.val();

            let paytable = paytables[gametype].hands;
            let result = "";

            switch (gametype) {
                case "poker":
                    result = checkPokerHand(game.hand);
                    break;
                case "dueces":
                    result = checkDuecesHand(game.hand);
                    break;
                case "bonus":
                case "doublebonus":
                    result = checkBonusHand(game.hand);
                    break;
                default:
                    result = checkPokerHand(game.hand);
                    break;
            }

            if (result && paytable[result]) {
                database.ref(`bank/${uid}`).once('value', function(snapshot) {
                    let bank = snapshot.val();

                    bank.balance += paytable[result] * game.bet;
                    database.ref(`bank/${uid}`).update({
                        "balance": bank.balance
                    });
                });
                response.status(200).send(cb + "('" + result + "', " + (paytable[result] * game.bet) + ")");
            } else {
                response.status(200).send(cb + "('" + result + "', 0)");
            }
        });
    } else {
        response.status(200).send(cb + "('', 0)");
    }
});

function checkPokerHand(hand) {
    let suits = [],
        nums = [],
        cnts = {},
        scnts = {};
    let hands = {
        "Flush": 0,
        "Pair": 0,
        "TwoPair": 0,
        "ThreeOfAKind": 0,
        "FourOfAKind": 0,
        "FullHouse": 0,
        "Royal": 0,
        "Straight": 1
    };

    for (let i in hand) {
        if (hand.hasOwnProperty(i)) {
            let match = hand[i].match(/(\d+)([DHCS])/);

            suits.push(match[2]);
            nums.push(parseInt(match[1]));

            if (!cnts[match[1]]) cnts[match[1]] = 0;
            cnts[match[1]]++;

            if (!scnts[match[2]]) scnts[match[2]] = 0;
            scnts[match[2]]++;
        }
    }
    nums = nums.sort(function(a, b) {
        return a - b;
    });

    let lastCard = 0;
    for (let i = 0; i < nums.length; i++) {
        if (!lastCard) {
            lastCard = nums[i];
        } else if (hands.Straight && (lastCard + 1 !== nums[i])) {
            if (!(nums[i] === 10 && lastCard === 1)) {
                console.log("No Straight: last card: " + lastCard + " [" + (lastCard + 1) + "] this card: " + nums[i]);
                hands.Straight = 0;
            }
        }
        lastCard = nums[i];
        if (cnts[nums[i]] === 2) {
            if (hands.Pair && (hands.Pair !== nums[i])) {
                hands.TwoPair = 1;
            } else {
                hands.Pair = nums[i];
            }
        }
        if (cnts[nums[i]] === 3) {
            hands.ThreeOfAKind = 1;
        }
        if (cnts[nums[i]] === 4) {
            hands.FourOfAKind = 1;
        }
    }
    if (hands.Straight) {
        if ((nums[0] === 1) && (nums[nums.length - 1] === 13)) {
            hands.Royal = 1;
        }
    }
    let skeys = Object.keys(scnts);
    for (let i = 0; i < skeys.length; i++) {
        if (scnts[skeys[i]] === 5) {
            hands.Flush = 1;
        }
    }

    let result = "";
    if (hands.Flush) result = "Flush";
    if (hands.Straight) result = "Straight";
    if (hands.Flush && hands.Straight) result = "StraightFlush";
    if (hands.Flush && hands.Straight && hands.Royal) result = "RoyalFlush";
    if (hands.Pair && ((hands.Pair > 10) || (hands.Pair === 1))) result = "JacksOrBetter";
    if (hands.TwoPair) result = "TwoPair";
    if (hands.ThreeOfAKind) result = "ThreeOfAKind";
    if (hands.Pair && hands.ThreeOfAKind) result = "FullHouse";
    if (hands.FourOfAKind) result = "FourOfAKind";
    console.log("Hand:" + JSON.stringify(hand) + "  Result: " + result);

    return result;
}

function checkBonusHand(hand) {
    let suits = [],
        nums = [],
        cnts = {},
        scnts = {};
    let hands = {
        "Flush": 0,
        "Pair": 0,
        "TwoPair": 0,
        "ThreeOfAKind": 0,
        "FourOfAKind": 0,
        "FullHouse": 0,
        "Royal": 0,
        "Straight": 1,
        "Four234": 0,
        "Four5K": 0,
        "FourAces": 0
    };

    for (let i in hand) {
        if (hand.hasOwnProperty(i)) {
            let match = hand[i].match(/(\d+)([DHCS])/);

            suits.push(match[2]);
            nums.push(parseInt(match[1]));

            if (!cnts[match[1]]) cnts[match[1]] = 0;
            cnts[match[1]]++;

            if (!scnts[match[2]]) scnts[match[2]] = 0;
            scnts[match[2]]++;
        }
    }
    nums = nums.sort(function(a, b) {
        return a - b;
    });

    let lastCard = 0;
    for (let i = 0; i < nums.length; i++) {
        if (!lastCard) {
            lastCard = nums[i];
        } else if (hands.Straight && (lastCard + 1 !== nums[i])) {
            if (!(nums[i] === 10 && lastCard === 1)) {
                console.log("No Straight: last card: " + lastCard + " [" + (lastCard + 1) + "] this card: " + nums[i]);
                hands.Straight = 0;
            }
        }
        lastCard = nums[i];
        if (cnts[nums[i]] === 2) {
            if (hands.Pair && (hands.Pair !== nums[i])) {
                hands.TwoPair = 1;
            } else {
                hands.Pair = nums[i];
            }
        }
        if (cnts[nums[i]] === 3) {
            hands.ThreeOfAKind = 1;
        }
        if (cnts[nums[i]] === 4) {
            hands.FourOfAKind = 1;
            if (nums[i] === 1) {
                hands.FourAces = 1;
            } else if (nums[i] > 1 && nums[i] < 5) {
                hands.Four234 = 1;
            } else if (nums[i] > 4 && nums[i] < 14) {
                hands.Four5K = 1;
            }
        }
    }
    if (hands.Straight) {
        if ((nums[0] === 1) && (nums[nums.length - 1] === 13)) {
            hands.Royal = 1;
        }
    }
    let skeys = Object.keys(scnts);
    for (let i = 0; i < skeys.length; i++) {
        if (scnts[skeys[i]] === 5) {
            hands.Flush = 1;
        }
    }

    let result = "";
    if (hands.Pair && ((hands.Pair > 10) || (hands.Pair === 1))) result = "JacksOrBetter";
    if (hands.TwoPair) result = "TwoPair";
    if (hands.ThreeOfAKind) result = "ThreeOfAKind";
    if (hands.Straight) result = "Straight";
    if (hands.Flush) result = "Flush";
    if (hands.Flush && hands.Straight) result = "StraightFlush";
    if (hands.Pair && hands.ThreeOfAKind) result = "FullHouse";
    if (hands.FourOfAKind) result = "FourOfAKind";
    if (hands.Four234) result = "Four234";
    if (hands.Four5K) result = "Four5K";
    if (hands.FourAces) result = "FourAces";
    if (hands.Flush && hands.Straight && hands.Royal) result = "NaturalRoyalFlush";

    console.log("Hand:" + JSON.stringify(hand) + "  Result: " + result);

    return result;
}

function checkDuecesHand(hand) {
    let suits = [],
        nums = [],
        cnts = {},
        scnts = {};
    let hands = {
        "Pair": 0,
        "Flush": 0,
        "ThreeOfAKind": 0,
        "FourOfAKind": 0,
        "FullHouse": 0,
        "Royal": 0,
        "Straight": 0,
        "FourDueces": 0,
        "FiveOfAKind": 0,
        "Dueces": 0
    };
    let nums2 = [];
    for (let i in hand) {
        if (hand.hasOwnProperty(i)) {
            let match = hand[i].match(/(\d+)([DHCS])/);

            suits.push(match[2]);
            nums.push(parseInt(match[1]));

            let num2 = parseInt(match[1]);
            nums2.push(num2);
            if (parseInt(match[1]) === 2) {
                hands.Dueces++;
            }
            if (!cnts[match[1]]) cnts[match[1]] = 0;
            cnts[match[1]]++;

            if (!scnts[match[2]]) scnts[match[2]] = 0;
            if (num2 !== 2) scnts[match[2]]++;
        }
    }

    console.log("suit counts: " + JSON.stringify(scnts));
    nums = nums.sort(function(a, b) {
        return a - b;
    });
    nums2 = nums2.sort(function(a, b) {
        return a - b;
    });

    for (let i = 0; i < nums2.length; i++) {
        let num2 = nums2[i];
        switch (num2) {
            case 1:
                num2 = "A";
                break;
            case 10:
                num2 = "T";
                break;
            case 11:
                num2 = "J";
                break;
            case 12:
                num2 = "Q";
                break;
            case 13:
                num2 = "K";
                break;
            default:
                num2 = num2;
        }
        nums2[i] = num2;
    }

    let skeys = Object.keys(scnts);
    for (let i = 0; i < skeys.length; i++) {
        if (scnts[skeys[i]] === 5) {
            hands.Flush = 1;
        }
        if (scnts[skeys[i]] + hands.Dueces === 5) {
            hands.Flush = 1;
        }
    }

    let handcheck = nums2.join('');
    let wildroyals = ["A22QK", "A22JK", "A22TK", "A22JQ", "A22TQ", "A22TJ", "22JQK", "22TQK", "22TJK", "22TJQ", "A222K", "A222Q", "A222J", "A222T", "222QK", "222JK", "222TK", "222JQ", "222TQ", "222TJ", "ATJQK", "2TJQK", "A2TJQ", "A2TJK", "A2TQK", "A2JQK"];
    let wildstraights = ["A22QK", "A22JK", "A22TK", "A22JQ", "A22TQ", "A22TJ", "22JQK", "22TQK", "22TJK", "22TJQ", "A222K", "A222Q", "A222J", "A222T", "222QK", "222JK", "222TK", "222JQ", "222TQ", "222TJ", "ATJQK", "229QK", "229JK", "229TK", "229JQ", "229TQ", "229TJ", "228JQ", "228TQ", "2289Q", "228TJ", "2289J", "2289T", "227TJ", "2279J", "2278J", "2279T", "2278T", "22789", "2269T", "2268T", "2267T", "22689", "22679", "22678", "22589", "22579", "22569", "22578", "22568", "22567", "22478", "22468", "22458", "22467", "22457", "22456", "22367", "22357", "22347", "22356", "22346", "22345", "22A45", "22A35", "22A34", "2229K", "2229Q", "2229J", "2229T", "2228Q", "2228J", "2228T", "22289", "2227J", "2227T", "22279", "22278", "2226T", "22269", "22268", "22267", "22259", "22258", "22257", "22256", "22248", "22247", "22246", "22245", "22237", "22236", "22235", "22234", "222A5", "222A4", "222A3", "A2345", "23456", "34567", "24567", "23567", "23467", "23457", "23456", "45678", "25678", "24678", "24578", "24568", "24567", "56789", "26789", "25789", "25689", "25679", "25678", "6789T", "2789T", "2689T", "2679T", "2678T", "26789", "289TJ", "279TJ", "278TJ", "2789J", "2789T", "789TJ", "289TJ", "279TJ", "278TJ", "2789J", "2789T", "89TJQ", "29TJQ", "28TJQ", "289JQ", "289TQ", "289TJ", "9TJQK", "2TJQK", "29JQK", "29TQK", "29TJK", "29TJQ", "ATJQK", "A2TJQ", "A2TJK", "A2TQK", "A2JQK"];

    console.log("handcheck: " + handcheck);

    if (wildroyals.includes(handcheck) && hands.Flush) {
        return hands.Dueces ? "DuecesRoyalFlush" : "NaturalRoyalFlush";
    }
    if (wildstraights.includes(handcheck) && hands.Flush) {
        return "StraightFlush";
    }
    if (wildstraights.includes(handcheck)) {
        return "Straight";
    }

    for (let i = 0; i < nums.length; i++) {
        if (cnts[nums[i]] + hands.Dueces === 5) {
            hands.FiveOfAKind = 1;
        }
        if ((cnts[nums[i]] === 4) && (nums[i] === 2)) {
            hands.FourDueces = 1;
        } else if ((cnts[nums[i]] === 4) || ((nums[i] !== 2) && cnts[nums[i]] + hands.Dueces === 4)) {
            hands.FourOfAKind = 1;
        }
        if ((cnts[nums[i]] === 3) && (nums[i] !== 2)) {
            hands.ThreeOfAKind = nums[i];
        }
        if ((cnts[nums[i]] === 2) && (nums[i] !== 2) && !hands.Pair) {
            hands.Pair = nums[i];
        }
        if ((nums[i] !== 2) && cnts[nums[i]] + hands.Dueces === 3) {
            hands.ThreeOfAKind = nums[i];
        }
    }

    if (hands.Straight) {
        if ((nums[0] === 1) && (nums[nums.length - 1] === 13)) {
            hands.Royal = 1;
        }
    }
    let result = "";
    if (hands.ThreeOfAKind) result = "ThreeOfAKind";
    if (hands.Flush) result = "Flush";
    // if (hands.Straight) result = "Straight";
    if (hands.Pair && hands.ThreeOfAKind && hands.Pair !== hands.ThreeOfAKind) result = "FullHouse";
    if (hands.FourOfAKind) result = "FourOfAKind";
    if (hands.FiveOfAKind) result = "FiveOfAKind";
    if (hands.FourDueces) result = "FourDueces";

    if (hands.Flush && hands.Straight) result = "StraightFlush";
    if (hands.Flush && hands.Straight && hands.Royal) result = "NaturalRoyalFlush";


    console.log("Hand:" + JSON.stringify(hand) + "  Result: " + result);

    return result;
}
exports.joinTable = functions.https.onRequest((request, response) => {
    let gametype = request.query.game;
    let uid = request.query.uid;
    let cb = request.query.callback;
    let tablenum = request.query.table;

    let seatOrder = [3, 2, 4, 1, 5];
    database.ref(`tables`).once('value', function(snap) {
        let bj = snap.val();
        let mytable = 0;
        let myseat = 0;
        if (bj) {
            for (let i = 1; i < bj.tableCount + 1; i++) {
                if (!bj[i].seats) {
                    myseat = 3;
                    mytable = i;
                    i = bj.tableCount + 1;
                } else if (bj[i].seats[uid]) {
                    myseat = bj[i].seats[uid];
                    mytable = i;
                    i = bj.tableCount + 1;
                } else {
                    for (let s = 1; s < 6; s++) {
                        if (!bj[i].seats[seatOrder[s - 1]]) {
                            myseat = seatOrder[s - 1];
                            mytable = i;
                            i = bj.tableCount + 1;
                            s = 6;
                        }
                    }
                }
            }

            if (!mytable || !myseat) {
                bj.tableCount++;
                database.ref(`tables/${bj.tableCount}`).set({
                    "action": "",
                    "dealer": {
                        "cards": {
                            "hand": [],
                            "total": 0
                        },
                        "blackjack": 0,
                        "busted": 0,
                        "total": 0
                    },
                    "players": {},
                    "seats": {},
                    "shoe": {}
                });
                myseat = 3;
                mytable = bj.tableCount;
            }

            database.ref(`users/${uid}`).once("value", function(snap) {
                let userinfo = snap.val();
                let player;
                if (!bj[mytable].players[uid]) {
                    player = {
                        "table": mytable,
                        "seat": myseat,
                        "cards": [{
                            "total": 0,
                            "busted": 0,
                            "blackjack": 0
                        }],
                        "bet": 0,
                        "blackjack": 0,
                        "busted": 0,
                        "splitting": 0,
                        "info": userinfo
                    };
                    database.ref(`tables/${mytable}/players/${uid}`).set(player);
                } else {
                    player = {
                        "table": mytable,
                        "seat": myseat,
                        "info": userinfo
                    };
                    database.ref(`tables/${mytable}/players/${uid}`).update(player);
                }
                let upd = {};
                upd[myseat] = uid;
                upd[uid] = myseat;
                database.ref(`tables/${mytable}/seats`).update(upd);
            });
        }

        database.ref(`tables/${tablenum}`).once("value", function(snap) {
            let latest = snap.val();
            let out = {
                "table": mytable,
                "seat": myseat,
                "game": latest
            };
            response.status(200).send(cb + "(" + JSON.stringify(out) + ");");
        });
    });
});

exports.deal = functions.https.onRequest((request, response) => {
    let uid = request.query.uid;
    let cb = request.query.callback;
    let tablenum = request.query.table;

    if (tablenum && uid && cb) {
        let deck = makeDeck(1);
        let out = {
            "players": {},
            "dealer": {}
        };

        database.ref(`tables/${tablenum}`).once("value", function(snap) {
            let table = snap.val(),
                i, hand, tot, cards;
            let gid = parseInt(table.gameID) + 1;
            database.ref(`tables/${tablenum}`).update({
                "gameID": gid
            });

            for (i in table.players) {
                if (table.players.hasOwnProperty(i)) {
                    if (parseInt(table.players[i].bet) > 0) {
                        hand = deck.splice(0, 2);
                        tot = tallyHand(hand);
                        cards = [{
                            "hand": hand,
                            "total": tot
                        }];
                        database.ref(`tables/${tablenum}/players/${i}/cards`).set(cards);
                        out.players[i] = {
                            "cards": cards,
                            "seat": table.players[i].seat,
                            "info": table.players[i].info
                        };
                        if (tot === 21) {
                            out.players[i].blackjack = 1;
                        }
                    }
                }
            }
            hand = deck.splice(0, 2);
            tot = tallyHand(hand);
            cards = {
                "hand": hand,
                "total": tot
            };
            database.ref(`tables/${tablenum}/dealer/cards`).set(cards);
            out.dealer = cards;

            database.ref(`tables/${tablenum}/shoe`).set(deck);

            /**
            //for (i=0; i < deck.length; i++) {
            //   updates[`${tablenum}/shoe/${i}`] = deck[i];
            //}
            //updates[`${tablenum}/shoe/next`] = deck.length - 1;
            */
            let updates = {};

            let seatnums = Object.keys(table.seats).sort();
            table.currentSeat = 0;
            let firstSeat = nextPlayer(table);
            updates[`${tablenum}/currentSeat`] = parseInt(firstSeat);

            console.log("[deal] Setting first player seat to " + firstSeat);
            ref.update(updates); // Send our new deck of cards to database

            out.currentSeat = parseInt(firstSeat);
            response.status(200).send(cb + "(" + JSON.stringify(out) + ");");

        });
    }
});

function nextCard(shoe) {
    let keys = Object.keys(shoe);
    return shoe[keys[keys.length - 1]];
}

exports.hit = functions.https.onRequest((request, response) => {
    let tablenum = request.query.table;
    let uid = request.query.uid;
    let cb = request.query.callback;

    if (tablenum && uid && cb) {
        database.ref(`tables/${tablenum}`).once("value", function(snap) {
            let table = snap.val();

            if (parseInt(table.currentSeat) === parseInt(table.seats[uid])) {
                let nextCard = table.shoe.splice(0, 1)[0];

                let newhand = Array.from(table.players[uid].cards[0].hand);
                newhand.push(nextCard);

                let handtotal = tallyHand(newhand);
                let busted = (handtotal > 21) ? 1 : 0;
                let playerUpdate = {
                    "hand": newhand,
                    "busted": busted,
                    "total": handtotal
                };

                console.log("Dealt '" + nextCard + "' as next card for " + uid);
                console.log("Updating player: " + JSON.stringify(playerUpdate));
                database.ref(`tables/${tablenum}/shoe`).set(table.shoe);
                database.ref(`tables/${tablenum}/players/${uid}/cards/0`).update(playerUpdate);

                let out = {
                    "uid": uid,
                    "player": "player" + table.seats[uid],
                    "card": nextCard,
                    "hand": newhand,
                    "busted": busted,
                    "total": handtotal
                };
                let next = 0;
                broadcast(tablenum, "displayCard", {
                    "card": nextCard,
                    "player": "player" + table.players[uid].seat,
                    "seat": table.players[uid].seat,
                    "uid": uid
                });
                response.status(200).send(cb + "(" + JSON.stringify(out) + ");");
                if (busted) {
                    next = nextPlayer(tablenum);
                    database.ref(`tables/${tablenum}`).update({
                        "currentSeat": next
                    });
                    if (next === 'dealer') {
                        playDealer(tablenum);
                    }
                }
            } else {
                response.status(200).send("handleError('ERROR: Invalid move. Player out of turn. [currentSeat:" + table.currentSeat + " mySeat:" + table.seats[uid] + "');");
            }
        });
    } else {
        response.status(200).send("handleError('ERROR: Invalid request. Missing parameters [table:" + tablenum + ",uid:" + uid + ",callback:" + cb + "].');");
    }
});

exports.bet = functions.https.onRequest((request, response) => {
    let tablenum = request.query.table;
    let uid = request.query.uid;
    let cb = request.query.callback;
    let bet = parseInt(request.query.bet);

    database.ref(`bank/${uid}`).once("value", function(snap) {
        let bank = snap.val();

        database.ref(`tables/${tablenum}/players/${uid}`).once("value", function(snap) {
            let player = snap.val();

            if (player) {
                bank.balance += player.bet;
            }
            player.bet = 0;
            if (bank.balance - bet < 0) {
                return response.status(200).send("handleError( {'error':'broke', 'msg':'Insufficient funds available to place bet.'})");
            }
            database.ref(`bank/${uid}`).update({
                "balance": bank.balance - bet
            });
            database.ref(`tables/${tablenum}/players/${uid}`).update({
                "bet": bet
            });

        });
    });
    database.ref(`tables/${tablenum}/players/${uid}`).once("value", function(snap) {
        let player = snap.val();

        console.log(player);
        response.status(200).send(cb + "(" + JSON.stringify(player) + ");");
    });

});

exports.stay = functions.https.onRequest((request, response) => {
    let tablenum = request.query.table;
    let uid = request.query.uid;
    let cb = request.query.callback;
    let out = {};

    database.ref(`tables/${tablenum}`).once("value", function(snap) {
        let table = snap.val();
        let next = table.currentSeat;
        console.log("[stay] currentSeat: " + table.currentSeat + " mySeat: " + table.seats[uid]);
        if (parseInt(table.currentSeat) == parseInt(table.seats[uid])) {
            next = nextPlayer(table);
            console.log("[stay] Moving to next player: " + next);

            if (next) {
                database.ref(`tables/${tablenum}`).update({
                    "currentSeat": next
                });

                if (next == 'dealer') {
                    console.log("[stay] no more players. playing dealer.");
                    playDealer(tablenum);
                }
            }
        } else {
            console.log("[stay] Out-of-turn move by player " + uid);
        }
        response.status(200).send(cb + "(" + JSON.stringify(next) + ");");
    });
});

exports.doubledown = functions.https.onRequest((request, response) => {
    let tablenum = request.query.table;
    let uid = request.query.uid;
    let cb = request.query.callback;
    let hand = request.query.hand || 0;

    database.ref(`tables/${tablenum}`).once("value", function(snap) {
        let table = snap.val();
        let nextCard = nextBJCard(tablenum);
        let currentHand = table.players[uid].cards[hand].hand;
        currentHand.push(nextCard);
        let total = tallyCards(currentHand);
        let upd = {
            "doubled": 1,
            "hand": currentHand,
            "total": total
        };

        database.ref(`tables/${tablenum}/players/${uid}/cards/${hand}`).update(upd);

        response.status(200).send(cb + "(" + JSON.stringify(out) + ");");
    });

});

exports.split = functions.https.onRequest((request, response) => {
    let tablenum = request.query.table;
    let uid = request.query.uid;
    let cb = request.query.callback;

    database.ref(`tables/${tablenum}`).once("value", function(snap) {
        let table = snap.val();

        console.log(table.seats);
        response.status(200).send(cb + "(" + JSON.stringify(out) + ");");
    });

});

function playDealer(table) {
    return database.ref(`tables/${table}`).once("value", function(snap) {
        let game = snap.val();
        let cards = game.dealer.cards.hand;
        let total = tallyHand(cards);

        while (total < 17) {
            let nextCard = game.shoe.splice(0, 1)[0];
            cards.push(nextCard);
            total = tallyHand(cards);
        }
        database.ref(`tables/${table}/shoe`).set(game.shoe);
        let busted = (total > 21) ? 1 : 0;
        database.ref(`tables/${table}`).update({
            "currentSeat": 0
        });
        let upd = {
            "hand": cards,
            "total": total,
            "busted": busted
        };

        database.ref(`tables/${table}/dealer/cards`).set(upd);

        let results = {};
        for (let i in game.players) {
            if (game.players.hasOwnProperty(i)) {
                let pl = game.players[i];
                if (pl && parseInt(pl.bet) > 0) {
                    let cardKeys = Object.keys(pl.cards);
                    results[i] = {
                        "hands": [],
                        "win": 0
                    }; // {"result":"","win":0};
                    let tot = 0;
                    for (let j = 0; j < cardKeys.length; j++) {
                        let cardTotal = tallyHand(pl.cards[j].hand);
                        console.log("dealer: " + total + "  player: " + cardTotal);
                        if (cardTotal > 21) {
                            results[i].hands.push({
                                "result": "BUST",
                                "amount": 0,
                                "handTotal": cardTotal
                            });
                        } else if (((cardTotal < 22) && (cardTotal > total)) || (total > 21)) {
                            results[i].hands.push({
                                "result": "WIN",
                                "amount": parseInt(pl.bet) * 2,
                                "handTotal": cardTotal,
                                "dealerTotal": total
                            });
                            results[i].win += parseInt(pl.bet) * 2;
                        } else if ((cardTotal < 22) && (cardTotal === total)) {
                            results[i].hands.push({
                                "result": "PUSH",
                                "amount": pl.bet,
                                "handTotal": cardTotal,
                                "dealerTotal": total
                            });
                            results[i].win += parseInt(pl.bet);
                        } else {
                            results[i].hands.push({
                                "result": "LOSE",
                                "amount": 0,
                                "handTotal": cardTotal,
                                "dealerTotal": total
                            });
                        }
                    }
                    database.ref(`bank/${i}`).once("value", (snap) => {
                            let bank = snap.val();
                            const purse = parseInt(bank.balance) + results[i].win;
                            database.ref(`bank/${i}`).update({
                                "balance": purse
                            });
                        });
                }
            }
        }
        upd.results = results;
        broadcast(table, "doDealer", upd);
    });
}

function nextBJCard(table) {
    return database.ref(`tables/${table}`).once("value", function(snap) {
        let game = snap.val();
        let nextCard = game.shoe.split(0, 1);
        database.ref(`tables/${table}/shoe`).set(game.shoe);

        return nextCard;
    });
}

function nextPlayer(table) {
    let cnt = parseInt(table.currentSeat) + 1;

    for (let i = cnt; i < 6; i++) {
        let seat = table.seats[i];
        if (seat) {
            let player = table.players[seat];
            if (player) {
                if (parseInt(player.bet) > 0) {
                    return i;
                }
            }
        }
    }
    return "dealer";
}

function tallyHand(cards) {
    let tot = 0,
        aces = 0;
    for (let i = 0; i < cards.length; i++) {
        let num = parseInt(cards[i]);
        if (num > 10) num = 10;
        if (num == 1) aces++;

        tot += num;
    }

    if (aces) {
        if (tot + 10 <= 21) {
            tot += 10;
        }
    }
    return tot;
}
let broadcasted = {};

function broadcast(table, action, payload) {
    let bid = Date.now();
    database.ref(`tables/${table}`).once("value", function(snap) {
        let tbl = snap.val();
        let players = Object.keys(tbl.players);
        let update = {};
        let uid;
        for (let i = 0; i < players.length; i++) {
            uid = players[i];
            update = {
                "bid": bid,
                "action": action,
                "payload": payload
            };
            database.ref(`tables/${table}/actions/${uid}`).push(update);
            broadcasted[uid + bid + action] = 1;
        }
    });
}

function makeDeck(decks = 1) {
    let cards = []; // Array to store our cards into
    let suits = ['S', 'C', 'D', 'H']; // Array of suit identifiers

    // First loop over decks
    for (let j = 0; j < decks; j++) {
        // and then suits
        for (let s = 0; s < suits.length; s++) {
            // and finally card values
            for (let c = 0; c < 13; c++) {
                cards.push((c + 1) + suits[s]);
            }
        }
    }

    // Shuffle array any number of times
    let j, x, i, cnt = Math.floor(Math.random() * 10) + 5;
    while (cnt > 0) {
        for (i = cards.length; i; j = Math.floor(Math.random() * i), x = cards[--i], cards[i] = cards[j], cards[j] = x);
        cnt--;
    }

    return cards;
}

function anteUp(gametype, uid) {
    database.ref(`games/${gametype}/${uid}`).once('value', function(snap) {
        let game = snap.val();
        database.ref(`bank/${uid}/balance`).once('value', function(snap) {
            let balance = snap.val();
            balance -= game.bet;
            database.ref(`bank/${uid}`).update({
                "balance": balance
            });
        });
        game.pot += game.bet;
        database.ref(`games/${gametype}/${uid}`).update({
            "pot": game.pot
        });
    });
}

function reshuffle(arr) {
    let j, x, i, cnt = Math.floor(Math.random() * 10) + 3;
    while (cnt > 0) {
        for (i = arr.length; i; j = Math.floor(Math.random() * i), x = arr[--i], arr[i] = arr[j], arr[j] = x);
        cnt--;
    }
    return arr;
}
/*
exports.seatChange = functions.database.ref("tables/{tablenum}/currentSeat").onWrite(event=>{
   const original = event.data.val();
   if (event.data.changed()) {
      if (original === "dealer") {
         return playDealer(event.params.tablenum); 
      }
   }
});
*/
