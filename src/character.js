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
        this.currentDialogue = null;
        this.currentDamageBlocked = null;
        this.currentDamageReceived = null;

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

        // this.initStatsFromChain();
    }

    // performs a move with collision checks
    moveTileXY(x, y) {
        // check collision
        if (this.scene.doesTileCollide(x, y)) {
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
            if (this.vrfProvider.roll(3) == 3) {
                this.animateDialogue('attack');
            }

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
        var damageReceived = Math.max(0, damageDealt - this.dp);

        // animate damage done
        this.animateDamage(damageDealt - damageReceived, damageReceived);

        // apply damage
        this.hp -= damageReceived;
        console.log("%s: takeDamage; damageReceived %s, remaining hp %s ", this.getName(), damageReceived, this.hp);
        if (this.hp <= 0) {
            this.kill();
        }
    }

    playSound(soundName) {

    }

    fadeCurrentDialogue() {
        if (this.currentDialogue != null) {
            var fadeDeltaPerUpdate = 1/60.0;
            // hacky
            this.currentDialogue.alpha -= fadeDeltaPerUpdate
            if (this.currentDialogue.alpha <= fadeDeltaPerUpdate){
                this.currentDialogue.destroy()
                this.currentDialogue = null;
            }
        }
    }

    fadeText(textObject) {
        if (textObject != null) {
            var fadeDeltaPerUpdate = 1/60.0;
            // hacky
            textObject.alpha -= fadeDeltaPerUpdate
            if (textObject.alpha <= fadeDeltaPerUpdate){
                textObject.destroy()
                return true;
            }
        }
        return false;
    }

    updateAnimations() {
        if (this.fadeText(this.currentDialogue)) {
            this.currentDialogue = null;
        }

        if (this.fadeText(this.currentDamageReceived)){
            this.currentDamageReceived = null;
        }

        if (this.fadeText(this.currentDamageBlocked)) {
            this.currentDamageBlocked = null;
        }
    }

    // animates a random dialogue choice in the supplied category
    animateDialogue(dialogueName) { 
        if (this.currentDialogue == null) {
            var dialogueCategory =  this.dialogue[dialogueName];
            var dialogueToDisplay = dialogueCategory[Math.floor(Math.random()*dialogueCategory.length)];
            var text = this.animateText(dialogueToDisplay, this.x - TILEWIDTH/2, this.y, "#000000");
            this.currentDialogue = text;
        }
        else {
            console.log("%s: current dialogue not null", this.getName());
        }
    }

    animateDamageStats(received, blocked) {
        if (this.currentDamageReceived == null && this.currentDamageBlocked == null){
            // crimson and grey colors with staggering
            this.currentDamageReceived = this.animateText(received, this.x + 20, this.y + TILEHEIGHT, "#dc143c", 20);
            this.currentDamageBlocked = this.animateText(blocked, this.x + TILEWIDTH - 20, this.y + TILEHEIGHT, "#bec2cb", 20);
        }
    }

    animateText(textToDisplay, x = this.x, y = this.y, color = "#000000", size = 12) {
        var text = this.scene.add.text(
            x, // center the text
            y,
            textToDisplay, 
            { fontFamily: "Consolas", fontSize: size + "px" , fill: color });
        text.stroke = "#de77ae";
        text.strokeThickness = 14;

        this.scene.physics.world.enable([ text ]);

        // text floats up
        text.body.velocity.setTo(0, -20);
        text.body.collideWorldBounds = true;
        
        return text;
    }
}