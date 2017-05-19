var Shoe = (function (decks) {
    this.shoe = [];

    function Deck(jokers) {
        // Deck array populated with card values prefixed with suit letter
        // Ace = 1; J/Q/K = 11/12/13
        var suits = ['h','d','s','c'], s=0, c=0;
        this.deck = [];

        for (; s < 4; s++) {
            for (; c < 13; c++) {
                this.deck.push(suits[s] + c);
            }
            c = 0;
        }

        function shuffle(qty) {
            qty = (qty) ? qty : 1;

            var j, x, i;
            while (qty > 0) {
                for(i = this.deck.length; i; j = Math.floor(Math.random() * i), x = this.deck[--i], this.deck[i] = this.deck[j], this.deck[j] = x);
                console.dir(this.deck);
                qty--;
            }
        }

        shuffle(20);

        return this.deck;
    }

    for (var i=0; i<decks; i++) {
        this.shoe.push(new Deck());
    }


    return function () {
            this.shoe = shoe;
            this.nextCard = function () {
                return this.shoe.shift();
            };
            this.Deck = Deck;
        };

}());
