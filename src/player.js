import Phaser from 'phaser';

import { CollidableSprite } from './collidableSprite';
import { TILEHEIGHT, TILEWIDTH, INPUT } from './dungeonScene';

export class Player extends CollidableSprite {
    constructor(scene, x, y, texture, frame) {
        super(scene, x, y, texture, frame);
    }

    update (input) {
        var dx = 0;
        var dy = 0;
        if (input == null) {
            // idle animation
        } else if (input == INPUT.UP) {
            dy = -1;
        } else if (input == INPUT.RIGHT) {
            dx = 1;
        } else if (input == INPUT.DOWN) {
            dy = 1;
        } else if (input == INPUT.LEFT) {
            dx = -1;
        } else if (input == INPUT.SPACE) {
            // attack
        } else { 
            // not recognized
        }

        this.moveXY(dx, dy)

    }

    // performs a move with collision checks
    moveXY(dx, dy) {
        if (dx == 0 && dy == 0) return;
        
        // get coordinates of tile origin
        var newX = (this.x/TILEWIDTH) + dx;
        var newY = (this.y/TILEHEIGHT) + dy;

        // check collision
        if(this.scene.doesTileCollide(newX, newY)) {
            // play sound
            return;
        }       

        // move 
        this.setX(this.x + dx*TILEWIDTH);
        this.setY(this.y + dy*TILEHEIGHT);

        // play sound
    }
}