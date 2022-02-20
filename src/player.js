import Phaser from 'phaser';

import { Character } from './character';
import { INPUT, TILEHEIGHT, TILEWIDTH } from './labScene';
import { VrfProvider } from './vrfProvider';

export class Player extends Character {
    constructor(scene, x, y, texture, frame, config = {}, vrfProvider) {
        super(scene, x, y, texture, frame, config, vrfProvider);
    }

    update (input) {
        var x,y;
        var dx = 0;
        var dy = 0;
        if (input == null) {
            // idle animation
            return;
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

        x = this.tileX() + dx;
        y = this.tileY() + dy;

        var attacked = this.attackIfMonsterExists(x, y);
        
        if (dx != 0 || dy != 0) {
            this.scene.moveHistory.push(x, y, attacked);
        }

        if (!attacked) {
            super.moveTileXY(x, y);
        }
    } 

    attackIfMonsterExists(x, y) {
        // check if the desired player movement points to
        // an enemy. do damage to the enemy if so.
        this.scene.enemies.forEach(enemy => {
            var ex = enemy.tileX();
            var ey = enemy.tileY();

            if (ex == x && ey == y) {
                // damage the monster
                this.damageEnemy(enemy);
                return true;
            }
        });

        return false;
    }

    damageEnemy(enemy) {
        // animate player sprite 

        // roll die

        // calculate damage

        // enemy.damage(damage)

        // play sound
    }

    initStatsFromChain() {
        this.hp = 1;
        this.ap = 1;
        this.dp = 1;
    }

    kill() {
        // play death animation + sound
    }
}