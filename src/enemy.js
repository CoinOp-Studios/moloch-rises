import Phaser from 'phaser';
import { CollidableSprite } from './collidableSprite';

import { TILEHEIGHT, TILEWIDTH, INPUT} from './dungeonScene';

export class Enemy extends CollidableSprite {
    constructor(scene, x, y, texture, frame) {
        super(scene, x, y, texture, frame);
    }

    update () {

    }
}
