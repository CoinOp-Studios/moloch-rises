import { TILEHEIGHT, TILEWIDTH, INPUT } from './labScene';

export class CollidableSprite extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, frame, config = {}) {
        super(scene, x, y, texture, frame);
        // config['sounds'] should be a dictionary with the following keys:
        //       'collision', 'attack', 'death', 'collide'
        // the values will be preloaded handles to sounds for these events
        this.soundDictionary = config['sounds'];

        // config['dialogue'] should be a dictionary with the following keys:
        //       'spawn', 'death', 'generic'
        // the values will be lists of dialogue strings 
        this.dialogue = config['dialogue'];

        // tuple of (x, y, attacked) to be used for zk snarks
        this.lastTurn = [];

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
    }

    // performs a move with collision checks
    moveTileXY(x, y) {
        if (x == 0 && y == 0) return;
        
        // check collision
        if(this.scene.doesTileCollide(x, y)) {
            // play sound
            return;
        }       

        // move 
        this.setX(x * TILEWIDTH);
        this.setY(y * TILEHEIGHT);

        // play sound
    }

    tileX() {
        return this.x / TILEWIDTH;
    }

    tileY() {
        return this.y / TILEWIDTH;
    }
}