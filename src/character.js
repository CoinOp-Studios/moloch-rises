import { TILEHEIGHT, TILEWIDTH, INPUT } from './labScene';
import { VrfProvider } from './vrfProvider';

export class Character extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, frame, config = {}, vrfProvider) {
        super(scene, x, y, texture, frame);
        // config['sounds'] should be a dictionary with the following keys:
        //       'move', 'attack', 'death', 'collide'
        // the values will be preloaded handles to sounds for these events
        this.soundDictionary = config['sounds'];

        // config['dialogue'] should be a dictionary with the following keys:
        //       'spawn', 'death', 'generic'
        // the values will be lists of dialogue strings 
        this.dialogue = config['dialogue'];

        this.vrfProvider = vrfProvider;

        // the top left pixel of the player is the
        // "anchor" for its x and y coordinates, as opposed
        // to the center
        this.setOrigin(0, 0);

        this.scene = scene;
        this.scene.add.existing(this);
        this.scene.physics.add.existing(this);
        this.setCollideWorldBounds(true);

        this.setX(x * TILEWIDTH);
        this.setY(y * TILEHEIGHT);

        this.hp = 0;
        this.ap = 0;
        this.dp = 0;
        this.numDice = 2;
        this.diceSides = 6;

        this.initStatsFromChain();
    }

    // performs a move with collision checks
    moveTileXY(x, y) {
        // check collision
        if(this.scene.doesTileCollide(x, y)) {
            // play sound
            this.playSound('collide');
            return;
        }       

        // move 
        this.setX(x * TILEWIDTH);
        this.setY(y * TILEHEIGHT);

        // play sound
        this.playSound('move');

        if (this.vrfProvider.roll(10) == 10){
            this.animateDialogue('generic');
        }
    }

    tileX() {
        return this.x / TILEWIDTH;
    }

    tileY() {
        return this.y / TILEHEIGHT;
    }

    getName() {
        // hacky way to uniquely determine name of the sprite
        return this.texture.key;
    }

    isDead() {
        return this.hp <= 0;
    }

    attack(character) {
        if (!character.isDead()) {
            // calculate damage w/ randomness
            var damage = this.calculateDamage();

            // animate attack

            // animate dialogue
            this.animateDialogue('attack');

            // play sound
            this.playSound('attack');

            // apply damage to character
            character.takeDamage(damage);
        }
    }

    calculateDamage() {
        // adapting from Simple D6 - 3rd ed: https://i.4pcdn.org/tg/1372924544491.pdf
        // ap === num dice

        // roll dice
        var maxRoll = 0;
        var numMax = 0;
        for (var i = 0; i < this.ap; i++) {
            var roll = this.vrfProvider.roll(this.diceSides);
            if (roll > maxRoll) {
                maxRoll = roll;
                continue;
            }
            if (roll == this.diceSides) {
                console.log("%s: natural %s added to total", this.getName(), this.diceSides);
                ++numMax;
            }
        }

        // damage should never exceed numSides (6) + ap - 1
        return maxRoll + numMax;
    }

    takeDamage(damageDealt) {
        var damageReceived = damageDealt - this.dp;

        // animate damage done
        this.animateDamage(damageDealt, damageReceived);

        // apply damage
        this.hp -= damageReceived;
        console.log("%s: takeDamage; damageReceived %s, remaining hp %s ", this.getName(), damageReceived, this.hp);
        if (this.hp <= 0) {
            this.kill();
        }
    }

    playSound(soundName) {

    }

    animateDialogue(dialogueName) {

    }

    animateDamage(dealt, received) {

    }
}