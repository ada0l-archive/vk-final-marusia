const { pick } = require('ramda')

class Card {
    constructor(value, suit) {
        this.value = value;
        this.suit = suit;
    }

    getValue() {
        const values = {
            1: "A",
            11: "J",
            12: "Q",
            13: "K"
        }
        if (this.value in values) {
            return values[this.value];
        }
        return String(this.value);
    }

    getSuit() {
        const suits = {
            1: "💕",
            2: "♠️",
            3: "♣️",
            4: "♦️",
        }
        if (this.suit in suits) {
            return suits[this.suit];
        }
        return String(this.suit);
    }

    toString() {
        return `${this.getValue()} ${this.getSuit()}`;
    }
}

const Verdicts = Object.freeze({
    BLACK_JACK_DEALER_WIN: "DEALER WIN",
    BLACK_JACK_PLAYER_WIN: "PLAYER WIN",
    BLACK_JACK_DRAW: "DRAW",
    BLACK_JACK_CONTINUE: "CONTINUE"
});

class BlackJackGame {
    constructor (queue, dealer, player) {
        let deserialize_list = (list) => {
            return list.map((card) => new Card(card.value, card.suit));
        }

        if (queue === undefined) {
            this.queue = this.createQueue();
        } else {
            this.queue = deserialize_list(queue);
        }

        if (dealer === undefined) {
            this.dealer = [];
        } else {
            this.dealer = deserialize_list(dealer);
        }
        if (player === undefined) {
            this.player = [];
        } else {
            this.player = deserialize_list(player);
        }
    }

    createQueue() {
        let queue = [];
        for (let i = 1; i < 5; ++i) {
            for (let j = 1; j < 14; ++j) {
                queue.push(new Card(j, i));
            }
        }
        queue.sort(() => Math.random() - 0.5);
        return queue;
    }

    _takeCard(isPlayer) {
        if (isPlayer) {
            this.player.push(this.queue.pop());
        } else {
            this.dealer.push(this.queue.pop());
        }
    }

    takeCardByPlayer() {
        this._takeCard(true);
    }

    takeCardByDealer() {
        this._takeCard(false);
    }

    _calculateScore(isPlayer) {
        let result = 0;
        let func = (list) => {
            list.forEach((card) => {
                if (2 <= card.value && card.value <= 10) {
                    result += card.value;
                } else if (card.value === 1 && result < 11) {
                    if (result > 10) {
                        result += 1;
                    } else {
                        result += 11;
                    }
                } else {
                    result += 10;
                }
            });
            return result;
        }
        if (isPlayer) {
            return func(this.player);
        } else {
            return func(this.dealer);
        }
    }

    calculatePlayerScore() {
        return this._calculateScore(true);
    }

    calculateDealerScore() {
        return this._calculateScore(false);
    }

    dealerCanTakeCard() {
        return this.calculateDealerScore() < 17;
    }

    dealCards() {
        this.takeCardByDealer();
        this.takeCardByPlayer();
        this.takeCardByPlayer();
    }

    _getStringOfCards(queue) {
        return queue.map((x) => x.toString()).join(", ");
    }

    getVerdict() {
        let dealer_score = this._calculateScore(this.dealer);
        let player_score = this._calculateScore(this.player);
        const BLACK_JACK_MAX_SCORE = 21;
        if (dealer_score > BLACK_JACK_MAX_SCORE && player_score > BLACK_JACK_MAX_SCORE) {
            return Verdicts.BLACK_JACK_DRAW;
        }
        if (dealer_score > BLACK_JACK_MAX_SCORE) {
            return Verdicts.BLACK_JACK_PLAYER_WIN;
        }
        if (dealer_score == BLACK_JACK_MAX_SCORE) {
            return Verdicts.BLACK_JACK_DEALER_WIN;
        }
        if (player_score > BLACK_JACK_MAX_SCORE) {
            return Verdicts.BLACK_JACK_DEALER_WIN;
        }
        if (player_score == BLACK_JACK_MAX_SCORE) {
            return Verdicts.BLACK_JACK_PLAYER_WIN;
        }
        return Verdicts.BLACK_JACK_CONTINUE;
    }

    toString() {
        return `Dealer: ${this._getStringOfCards(this.dealer)}:\n (${this.calculateDealerScore()})
                Player: ${this._getStringOfCards(this.player)}:\n (${this.calculatePlayerScore()})
                Verdict: ${this.getVerdict()}`;
    }
}

function blackJack({ request, session, state, version }) {
    let {original_utterance} = request;

    // first start
    if (state.session.blackjack === undefined) {
        state.session.blackjack = {};
    }

    // load
    let {queue, dealer, player} = state.session.blackjack;
    const blackjack = new BlackJackGame(queue, dealer, player);

    if (original_utterance == "Еще") {
        blackjack.takeCardByPlayer();
    }

    if (blackjack.dealerCanTakeCard()) {
        blackjack.takeCardByDealer();
    }

    let answer = blackjack.toString();

    if (original_utterance == "Хватит") {
        while (blackjack.getVerdict() == Verdicts.BLACK_JACK_CONTINUE) {
            blackjack.takeCardByDealer();
        }
    }

    if (blackjack.getVerdict() == Verdicts.BLACK_JACK_CONTINUE) {
        // save
        state.session.blackjack.queue = blackjack.queue;
        state.session.blackjack.dealer = blackjack.dealer;
        state.session.blackjack.player = blackjack.player;
    } else {
        state.session.blackjack = {};
        answer = blackjack.toString();
    }

    return {
        response: {
            text: answer,
            tts: answer,
            end_session: false,
        },
        session: pick(['session_id', 'message_id', 'user_id', 'blackjack'], session),
        session_state: state.session,
        version,
    }
}

module.exports = {blackJack}
