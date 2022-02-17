import Phaser from 'phaser';

import { TILEHEIGHT, TILEWIDTH, INPUT } from './dungeonScene';

export class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, frame) {
        super(scene, x, y, texture, 1);
        this.scene.add.existing(this);
        this.scene.physics.add.existing(this);
        this.setCollideWorldBounds(true);
    }

    update (input) {
        // todo: add collision check
        if (input == null) {
            // idle animation
        } else if (input == INPUT.UP) {
            this.y -= TILEHEIGHT;
        } else if (input == INPUT.RIGHT) {
            this.x += TILEWIDTH;
        } else if (input == INPUT.DOWN) {
            this.y += TILEHEIGHT;
        } else if (input == INPUT.LEFT) {
            this.x -= TILEWIDTH;
        } else { 
            // not recognized
        }
    }
}