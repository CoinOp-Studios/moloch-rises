import Phaser from 'phaser';

import { INPUT, TILEHEIGHT, TILEWIDTH } from './labScene';

export class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, frame) {
        super(scene, x, y, texture, frame);
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

    update(input) {
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
        var newX = (this.x / TILEWIDTH) + dx;
        var newY = (this.y / TILEHEIGHT) + dy;

        // check collision
        var nextTile = this.scene.map.getTileAt(newX, newY);

        if (nextTile == null || nextTile.collides) {
            // play sound
            return;
        }

        // move 
        this.setX(this.x + dx * TILEWIDTH);
        this.setY(this.y + dy * TILEHEIGHT);

        // play sound
    }
}